from __future__ import annotations

import errno
import json
import os
import re
import shutil
import uuid
from copy import deepcopy
from datetime import datetime
from functools import wraps
from pathlib import Path
from typing import Any

import firebase_admin
from dotenv import load_dotenv
from firebase_admin import auth as fb_auth, credentials
from flask import Flask, g, jsonify, render_template, request, send_from_directory
from werkzeug.utils import secure_filename

load_dotenv()

BASE_DIR  = Path(__file__).resolve().parent
DATA_DIR  = BASE_DIR / "data"
MEDIA_DIR = DATA_DIR / "media"
DATA_FILE = DATA_DIR / "notes.json"
TEMPLATES_FILE = DATA_DIR / "templates.json"
USERS_DIR = DATA_DIR / "users"
LEGACY_CLAIMED_MARKER = USERS_DIR / ".legacy_claimed"

DATA_DIR.mkdir(exist_ok=True)
MEDIA_DIR.mkdir(exist_ok=True)
USERS_DIR.mkdir(exist_ok=True)

MAX_CONTENT_LENGTH_MB = int(os.getenv("MAX_CONTENT_LENGTH_MB", "100"))
ALLOWED_MEDIA = {
    ".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic", ".heif", ".avif",
    ".mp4", ".mov", ".avi", ".webm", ".m4v", ".mkv",
}

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = MAX_CONTENT_LENGTH_MB * 1024 * 1024


def init_firebase_admin() -> bool:
    if firebase_admin._apps:
        return True
    try:
        sa_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
        if sa_json:
            cred = credentials.Certificate(json.loads(sa_json))
        else:
            sa_path = BASE_DIR / "serviceAccountKey.json"
            if not sa_path.exists():
                return False
            cred = credentials.Certificate(str(sa_path))
        firebase_admin.initialize_app(cred)
        return True
    except Exception as e:
        app.logger.error(f"Firebase Admin init failed: {e}")
        return False


FIREBASE_READY = init_firebase_admin()


def firebase_config_for_frontend() -> dict[str, str]:
    return {
        "apiKey": os.getenv("FIREBASE_API_KEY", ""),
        "authDomain": os.getenv("FIREBASE_AUTH_DOMAIN", ""),
        "projectId": os.getenv("FIREBASE_PROJECT_ID", ""),
        "storageBucket": os.getenv("FIREBASE_STORAGE_BUCKET", ""),
        "messagingSenderId": os.getenv("FIREBASE_MESSAGING_SENDER_ID", ""),
        "appId": os.getenv("FIREBASE_APP_ID", ""),
    }


def require_auth(view):
    @wraps(view)
    def wrapper(*args, **kwargs):
        if not FIREBASE_READY:
            return jsonify({"error": "Firebaseが設定されていません。管理者に連絡してください。"}), 503
        header = request.headers.get("Authorization", "")
        if not header.startswith("Bearer "):
            return jsonify({"error": "認証が必要です。"}), 401
        token = header[len("Bearer "):]
        try:
            decoded = fb_auth.verify_id_token(token)
        except Exception:
            return jsonify({"error": "認証が無効です。再度ログインしてください。"}), 401
        if not decoded.get("email_verified"):
            return jsonify({
                "error": "メールアドレスの確認が必要です。確認メール内のリンクを開いて認証を完了してください。",
                "code": "email-not-verified",
            }), 403
        g.uid = decoded["uid"]
        ensure_user_data(g.uid)
        return view(*args, **kwargs)
    return wrapper


def now_iso() -> str:
    return datetime.now().isoformat(timespec="seconds")


def make_id() -> str:
    return uuid.uuid4().hex[:12]


def default_data() -> dict[str, Any]:
    return {
        "version": 2,
        "notes": [
            {
                "id": make_id(),
                "parent_id": None,
                "title": "アイデア",
                "content": "ここにアイデアを追加できます。",
                "created_at": now_iso(),
                "updated_at": now_iso(),
                "source_file": None,
                "media": [],
                "pinned": False,
                "checked": False,
            }
        ],
    }


def user_dir(uid: str) -> Path:
    return USERS_DIR / uid


def user_data_file(uid: str) -> Path:
    return user_dir(uid) / "notes.json"


def user_templates_file(uid: str) -> Path:
    return user_dir(uid) / "templates.json"


def user_media_dir(uid: str) -> Path:
    d = MEDIA_DIR / uid
    d.mkdir(parents=True, exist_ok=True)
    return d


def read_data(uid: str) -> dict[str, Any]:
    f = user_data_file(uid)
    if not f.exists():
        data = default_data()
        write_data(uid, data)
        return data
    try:
        return json.loads(f.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        backup = f.with_suffix(
            f".broken-{datetime.now().strftime('%Y%m%d%H%M%S')}.json"
        )
        f.rename(backup)
        data = default_data()
        write_data(uid, data)
        return data


def write_data(uid: str, data: dict[str, Any]) -> None:
    f = user_data_file(uid)
    f.parent.mkdir(parents=True, exist_ok=True)
    f.write_text(
        json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def find_note(data: dict[str, Any], note_id: str) -> dict[str, Any] | None:
    return next((n for n in data["notes"] if n["id"] == note_id), None)


def would_create_cycle(
    data: dict[str, Any], note_id: str, new_parent_id: str | None
) -> bool:
    if new_parent_id is None:
        return False
    current = new_parent_id
    while current is not None:
        if current == note_id:
            return True
        parent = find_note(data, current)
        current = parent["parent_id"] if parent else None
    return False


def allowed_media_file(filename: str) -> bool:
    return Path(filename).suffix.lower() in ALLOWED_MEDIA


# ── テンプレート ────────────────────────────────────────────────────────────────

OFFICIAL_TEMPLATE_TIMESTAMP = "2026-06-10T00:00:00"
RETIRED_OFFICIAL_TEMPLATE_IDS = {"official-todo", "official-diary"}

OFFICIAL_TEMPLATES: list[dict[str, Any]] = [
    {
        "id": "official-dev-note",
        "name": "開発メモ",
        "official": True,
        "created_at": OFFICIAL_TEMPLATE_TIMESTAMP,
        "updated_at": OFFICIAL_TEMPLATE_TIMESTAMP,
        "tree": {
            "title": "開発メモ",
            "content": "開発中のアイデア、実装、改善案をまとめるテンプレートです。",
            "children": [
                {
                    "title": "アイデア",
                    "content": "今後実装したいものや、思いついたことを書き留めます。",
                    "children": [],
                },
                {
                    "title": "実装メモ",
                    "content": "作業した内容、判断したこと、参考リンクを残します。",
                    "children": [],
                },
                {
                    "title": "改善案",
                    "content": "使いにくい点や、直したい挙動を書き留めます。",
                    "children": [],
                },
                {
                    "title": "不具合",
                    "content": "再現手順、期待する動き、実際の動きをまとめます。",
                    "children": [],
                },
                {
                    "title": "リリースメモ",
                    "content": "公開前に確認することや、変更点をまとめます。",
                    "children": [],
                },
            ],
        },
    },
]


def official_templates() -> list[dict[str, Any]]:
    return deepcopy(OFFICIAL_TEMPLATES)


def default_templates_data() -> dict[str, Any]:
    return {"templates": official_templates()}


def ensure_official_templates(data: dict[str, Any]) -> bool:
    templates = data.setdefault("templates", [])
    before_count = len(templates)
    templates[:] = [
        template for template in templates
        if template.get("id") not in RETIRED_OFFICIAL_TEMPLATE_IDS
    ]
    changed = len(templates) != before_count
    by_id = {template.get("id"): template for template in templates}

    for official in OFFICIAL_TEMPLATES:
        existing = by_id.get(official["id"])
        if existing is None:
            templates.append(deepcopy(official))
            changed = True
            continue

        for key in ("name", "official", "tree"):
            next_value = deepcopy(official[key])
            if existing.get(key) != next_value:
                existing[key] = next_value
                changed = True
        if "created_at" not in existing:
            existing["created_at"] = official["created_at"]
            changed = True
        if existing.get("updated_at") != official["updated_at"]:
            existing["updated_at"] = official["updated_at"]
            changed = True

    return changed


def read_templates(uid: str) -> dict[str, Any]:
    f = user_templates_file(uid)
    if not f.exists():
        data = default_templates_data()
        write_templates(uid, data)
        return data
    try:
        data = json.loads(f.read_text(encoding="utf-8"))
        if ensure_official_templates(data):
            write_templates(uid, data)
        return data
    except json.JSONDecodeError:
        backup = f.with_suffix(
            f".broken-{datetime.now().strftime('%Y%m%d%H%M%S')}.json"
        )
        f.rename(backup)
        data = default_templates_data()
        write_templates(uid, data)
        return data


def write_templates(uid: str, data: dict[str, Any]) -> None:
    f = user_templates_file(uid)
    f.parent.mkdir(parents=True, exist_ok=True)
    f.write_text(
        json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def find_template(data: dict[str, Any], template_id: str) -> dict[str, Any] | None:
    return next((t for t in data["templates"] if t["id"] == template_id), None)


def build_template_tree(notes_data: dict[str, Any], note_id: str) -> dict[str, Any]:
    note     = find_note(notes_data, note_id)
    children = [n for n in notes_data["notes"] if n["parent_id"] == note_id]
    return {
        "title":    note["title"],
        "content":  note["content"],
        "children": [build_template_tree(notes_data, c["id"]) for c in children],
    }


def count_template_nodes(node: dict[str, Any]) -> int:
    return 1 + sum(count_template_nodes(c) for c in node.get("children", []))


def template_summary(template: dict[str, Any]) -> dict[str, Any]:
    return {
        "id":         template["id"],
        "name":       template["name"],
        "official":   bool(template.get("official")),
        "created_at": template["created_at"],
        "updated_at": template["updated_at"],
        "note_count": count_template_nodes(template["tree"]),
    }


def create_notes_from_template(
    node: dict[str, Any], parent_id: str | None
) -> list[dict[str, Any]]:
    note = {
        "id":          make_id(),
        "parent_id":   parent_id,
        "title":       str(node.get("title") or "新しいメモ")[:120],
        "content":     str(node.get("content") or ""),
        "created_at":  now_iso(),
        "updated_at":  now_iso(),
        "source_file": None,
        "media":       [],
        "pinned":      False,
        "checked":     False,
    }
    created = [note]
    for child in node.get("children", []):
        created.extend(create_notes_from_template(child, note["id"]))
    return created


# ── ユーザーごとのデータ移行 ──────────────────────────────────────────────────────

def rewrite_media_refs(content: str, uid: str) -> str:
    return re.sub(r"/media/(?!" + re.escape(uid) + r"/)", f"/media/{uid}/", content)


def rewrite_template_tree(node: dict[str, Any], uid: str) -> None:
    node["content"] = rewrite_media_refs(node.get("content", ""), uid)
    for child in node.get("children", []):
        rewrite_template_tree(child, uid)


def ensure_user_data(uid: str) -> None:
    final_dir = user_dir(uid)
    if final_dir.exists():
        return

    if not LEGACY_CLAIMED_MARKER.exists() and DATA_FILE.exists():
        tmp_dir = USERS_DIR / f"{uid}.tmp"
        if tmp_dir.exists():
            shutil.rmtree(tmp_dir)
        tmp_dir.mkdir(parents=True)

        notes_data = json.loads(DATA_FILE.read_text(encoding="utf-8"))
        for note in notes_data.get("notes", []):
            note["content"] = rewrite_media_refs(note.get("content", ""), uid)
            for item in note.get("media", []):
                item["filename"] = f"{uid}/{item['filename']}"
        (tmp_dir / "notes.json").write_text(
            json.dumps(notes_data, ensure_ascii=False, indent=2), encoding="utf-8"
        )

        if TEMPLATES_FILE.exists():
            tpl_data = json.loads(TEMPLATES_FILE.read_text(encoding="utf-8"))
            for template in tpl_data.get("templates", []):
                rewrite_template_tree(template["tree"], uid)
            (tmp_dir / "templates.json").write_text(
                json.dumps(tpl_data, ensure_ascii=False, indent=2), encoding="utf-8"
            )

        if MEDIA_DIR.exists():
            target_media = MEDIA_DIR / uid
            target_media.mkdir(parents=True, exist_ok=True)
            for f in MEDIA_DIR.iterdir():
                if f.is_file():
                    shutil.copy2(f, target_media / f.name)

        try:
            os.rename(tmp_dir, final_dir)
        except OSError:
            shutil.rmtree(tmp_dir, ignore_errors=True)
            return

        LEGACY_CLAIMED_MARKER.write_text(
            json.dumps(
                {"claimed_by_uid": uid, "claimed_at": now_iso()},
                ensure_ascii=False, indent=2,
            ),
            encoding="utf-8",
        )
        return

    final_dir.mkdir(parents=True, exist_ok=True)
    write_data(uid, default_data())
    write_templates(uid, default_templates_data())


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/")
def index():
    return render_template("index.html", firebase_config=firebase_config_for_frontend())


@app.get("/auth/action")
def auth_action():
    return render_template(
        "auth_action.html",
        firebase_config=firebase_config_for_frontend(),
    )


@app.get("/api/notes")
@require_auth
def get_notes():
    return jsonify(read_data(g.uid))


@app.post("/api/notes")
@require_auth
def create_note():
    payload   = request.get_json(silent=True) or {}
    parent_id = payload.get("parent_id")
    data      = read_data(g.uid)

    if parent_id is not None and not find_note(data, parent_id):
        return jsonify({"error": "親メモが見つかりません。"}), 404

    note = {
        "id":          make_id(),
        "parent_id":   parent_id,
        "title":       str(payload.get("title") or "新しいメモ")[:120],
        "content":     str(payload.get("content") or ""),
        "created_at":  now_iso(),
        "updated_at":  now_iso(),
        "source_file": None,
        "media":       [],
        "pinned":      False,
        "checked":     False,
    }
    data["notes"].append(note)
    write_data(g.uid, data)
    return jsonify(note), 201


@app.patch("/api/notes/<note_id>")
@require_auth
def update_note(note_id: str):
    payload = request.get_json(silent=True) or {}
    data    = read_data(g.uid)
    note    = find_note(data, note_id)

    if not note:
        return jsonify({"error": "メモが見つかりません。"}), 404

    if "title" in payload:
        note["title"] = str(payload["title"])[:120] or "無題"

    if "content" in payload:
        note["content"] = str(payload["content"])
        # content に含まれていない media 参照を削除（トリミング後の孤立参照対策）
        if "media" in note:
            note["media"] = [m for m in note["media"] if m["filename"] in note["content"]]

    if "parent_id" in payload:
        new_parent_id = payload["parent_id"]
        if new_parent_id is not None and not find_note(data, new_parent_id):
            return jsonify({"error": "移動先のメモが見つかりません。"}), 404
        if would_create_cycle(data, note_id, new_parent_id):
            return jsonify({"error": "自分自身の下には移動できません。"}), 400
        note["parent_id"] = new_parent_id
        if new_parent_id is not None:
            note["pinned"] = False

    if "pinned" in payload:
        pinned = bool(payload["pinned"])
        if pinned and note["parent_id"] is not None:
            return jsonify({"error": "ピン留めできるのは最上位メモだけです。"}), 400
        note["pinned"] = pinned

    if "checked" in payload:
        note["checked"] = bool(payload["checked"])

    note["updated_at"] = now_iso()
    write_data(g.uid, data)
    return jsonify(note)


@app.delete("/api/notes/<note_id>")
@require_auth
def delete_note(note_id: str):
    data = read_data(g.uid)
    note = find_note(data, note_id)

    if not note:
        return jsonify({"error": "メモが見つかりません。"}), 404

    delete_ids: set[str] = {note_id}
    changed = True
    while changed:
        changed = False
        for n in data["notes"]:
            if n["parent_id"] in delete_ids and n["id"] not in delete_ids:
                delete_ids.add(n["id"])
                changed = True

    data["notes"] = [n for n in data["notes"] if n["id"] not in delete_ids]
    write_data(g.uid, data)
    return jsonify({"deleted": list(delete_ids)})


@app.post("/api/notes/restore")
@require_auth
def restore_notes():
    payload = request.get_json(silent=True) or {}
    restore_items = payload.get("notes")
    insert_index = payload.get("insert_index")

    if not isinstance(restore_items, list) or not restore_items:
        return jsonify({"error": "復元するメモがありません。"}), 400

    data = read_data(g.uid)
    existing_ids = {n["id"] for n in data["notes"]}
    restored = []

    for raw in restore_items:
        if not isinstance(raw, dict):
            continue
        note_id = raw.get("id")
        if not note_id or note_id in existing_ids:
            continue
        restored.append({
            "id":          note_id,
            "parent_id":   raw.get("parent_id"),
            "title":       str(raw.get("title") or "無題")[:120],
            "content":     str(raw.get("content") or ""),
            "created_at":  raw.get("created_at") or now_iso(),
            "updated_at":  now_iso(),
            "source_file": raw.get("source_file"),
            "media":       raw.get("media") if isinstance(raw.get("media"), list) else [],
            "pinned":      bool(raw.get("pinned")) and raw.get("parent_id") is None,
            "checked":     bool(raw.get("checked")),
        })
        existing_ids.add(note_id)

    if not restored:
        return jsonify({"error": "復元できるメモがありません。"}), 400

    if isinstance(insert_index, int):
        idx = max(0, min(insert_index, len(data["notes"])))
    else:
        idx = len(data["notes"])
    data["notes"][idx:idx] = restored
    write_data(g.uid, data)
    return jsonify({"restored": restored})


@app.post("/api/notes/<note_id>/media")
@require_auth
def upload_media(note_id: str):
    data = read_data(g.uid)
    note = find_note(data, note_id)

    if not note:
        return jsonify({"error": "メモが見つかりません。"}), 404

    f = request.files.get("file")
    if not f or not f.filename:
        return jsonify({"error": "ファイルが送信されていません。"}), 400
    if not allowed_media_file(f.filename):
        return jsonify({
            "error": "未対応の形式です。対応: jpg, png, gif, webp, heic, mp4, mov, webm など"
        }), 400

    safe   = secure_filename(f.filename) or f"media{Path(f.filename).suffix.lower()}"
    stored = f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{make_id()}_{safe}"
    f.save(user_media_dir(g.uid) / stored)

    item = {
        "id":            make_id(),
        "filename":      f"{g.uid}/{stored}",
        "original_name": f.filename,
        "mime_type":     f.content_type or "",
        "created_at":    now_iso(),
    }

    if "media" not in note:
        note["media"] = []
    note["media"].append(item)
    note["updated_at"] = now_iso()
    write_data(g.uid, data)
    return jsonify(item), 201


@app.delete("/api/notes/<note_id>/media/<media_id>")
@require_auth
def delete_media(note_id: str, media_id: str):
    data = read_data(g.uid)
    note = find_note(data, note_id)

    if not note:
        return jsonify({"error": "メモが見つかりません。"}), 404

    media_list = note.get("media", [])
    item = next((m for m in media_list if m["id"] == media_id), None)
    if not item:
        return jsonify({"error": "メディアが見つかりません。"}), 404

    (MEDIA_DIR / item["filename"]).unlink(missing_ok=True)
    note["media"]      = [m for m in media_list if m["id"] != media_id]
    note["updated_at"] = now_iso()
    write_data(g.uid, data)
    return jsonify({"deleted": media_id})


@app.get("/media/<path:filename>")
def serve_media(filename: str):
    return send_from_directory(MEDIA_DIR, filename)


@app.post("/api/reorder")
@require_auth
def reorder_notes():
    """ノードの順序と親を同時に変更する。"""
    payload   = request.get_json(silent=True) or {}
    note_id   = payload.get("note_id")
    before_id = payload.get("before_id")   # None = 対象親の末尾
    parent_id = payload.get("parent_id")   # None = ルート

    data = read_data(g.uid)
    note = find_note(data, note_id)
    if not note:
        return jsonify({"error": "メモが見つかりません。"}), 404
    if before_id == note_id:
        return jsonify(note)
    if parent_id is not None and not find_note(data, parent_id):
        return jsonify({"error": "移動先のメモが見つかりません。"}), 404
    if before_id:
        before_note = find_note(data, before_id)
        if not before_note:
            return jsonify({"error": "挿入先のメモが見つかりません。"}), 404
        if before_note["parent_id"] != parent_id:
            return jsonify({"error": "同じ階層の間にのみ並び替えできます。"}), 400
    if would_create_cycle(data, note_id, parent_id):
        return jsonify({"error": "自分自身の下には移動できません。"}), 400

    # 現在位置から除去
    notes = [n for n in data["notes"] if n["id"] != note_id]
    note["parent_id"] = parent_id
    if parent_id is not None:
        note["pinned"] = False
    note["updated_at"] = now_iso()

    if before_id:
        idx = next((i for i, n in enumerate(notes) if n["id"] == before_id), len(notes))
        notes.insert(idx, note)
    else:
        notes.append(note)

    data["notes"] = notes
    write_data(g.uid, data)
    return jsonify(note)


@app.get("/api/templates")
@require_auth
def get_templates():
    data = read_templates(g.uid)
    templates = sorted(
        data["templates"],
        key=lambda t: (not bool(t.get("official")), t.get("created_at", "")),
    )
    return jsonify({"templates": [template_summary(t) for t in templates]})


@app.post("/api/templates")
@require_auth
def create_template():
    payload = request.get_json(silent=True) or {}
    note_id = payload.get("note_id")
    name    = str(payload.get("name") or "").strip()

    if not note_id:
        return jsonify({"error": "メモが指定されていません。"}), 400
    if not name:
        return jsonify({"error": "テンプレート名を入力してください。"}), 400

    notes_data = read_data(g.uid)
    if not find_note(notes_data, note_id):
        return jsonify({"error": "メモが見つかりません。"}), 404

    template = {
        "id":         make_id(),
        "name":       name[:120],
        "official":   False,
        "created_at": now_iso(),
        "updated_at": now_iso(),
        "tree":       build_template_tree(notes_data, note_id),
    }

    templates_data = read_templates(g.uid)
    templates_data["templates"].append(template)
    write_templates(g.uid, templates_data)
    return jsonify(template_summary(template)), 201


@app.patch("/api/templates/<template_id>")
@require_auth
def rename_template(template_id: str):
    payload  = request.get_json(silent=True) or {}
    data     = read_templates(g.uid)
    template = find_template(data, template_id)

    if not template:
        return jsonify({"error": "テンプレートが見つかりません。"}), 404
    if template.get("official"):
        return jsonify({"error": "公式テンプレートは名前を変更できません。"}), 403

    if "name" in payload:
        name = str(payload["name"]).strip()
        if not name:
            return jsonify({"error": "テンプレート名を入力してください。"}), 400
        template["name"] = name[:120]

    template["updated_at"] = now_iso()
    write_templates(g.uid, data)
    return jsonify(template_summary(template))


@app.delete("/api/templates/<template_id>")
@require_auth
def delete_template(template_id: str):
    data     = read_templates(g.uid)
    template = find_template(data, template_id)

    if not template:
        return jsonify({"error": "テンプレートが見つかりません。"}), 404
    if template.get("official"):
        return jsonify({"error": "公式テンプレートは削除できません。"}), 403

    data["templates"] = [t for t in data["templates"] if t["id"] != template_id]
    write_templates(g.uid, data)
    return jsonify({"deleted": template_id})


@app.post("/api/templates/<template_id>/apply")
@require_auth
def apply_template(template_id: str):
    templates_data = read_templates(g.uid)
    template = find_template(templates_data, template_id)
    if not template:
        return jsonify({"error": "テンプレートが見つかりません。"}), 404

    notes_data = read_data(g.uid)
    created = create_notes_from_template(template["tree"], None)
    created[0]["title"] = str(template.get("name") or "新しいメモ")[:120]
    notes_data["notes"].extend(created)
    write_data(g.uid, notes_data)
    return jsonify({"notes": created, "root_id": created[0]["id"]}), 201


@app.post("/api/export")
@require_auth
def export_notes():
    return jsonify(read_data(g.uid))


@app.delete("/api/account")
@require_auth
def delete_account():
    shutil.rmtree(user_dir(g.uid), ignore_errors=True)
    shutil.rmtree(MEDIA_DIR / g.uid, ignore_errors=True)
    try:
        fb_auth.delete_user(g.uid)
    except Exception as e:
        app.logger.warning(f"firebase delete_user failed for {g.uid}: {e}")
    return jsonify({"deleted": g.uid})


@app.errorhandler(413)
def too_large(_error):
    return jsonify({
        "error": f"ファイルが大きすぎます。上限は {MAX_CONTENT_LENGTH_MB}MB です。"
    }), 413


@app.errorhandler(OSError)
def storage_error(error):
    if getattr(error, "errno", None) == errno.ENOSPC:
        return jsonify({
            "error": "保存先の空き容量が不足しています。不要なファイルを削除してからもう一度お試しください。"
        }), 507
    raise error


if __name__ == "__main__":
    port = int(os.getenv("PORT", "5002"))
    app.run(debug=True, port=port)
