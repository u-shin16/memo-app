from __future__ import annotations

import errno
import json
import os
import uuid
from copy import deepcopy
from datetime import datetime
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from flask import Flask, jsonify, render_template, request, send_from_directory
from werkzeug.utils import secure_filename

load_dotenv()

BASE_DIR  = Path(__file__).resolve().parent
DATA_DIR  = BASE_DIR / "data"
MEDIA_DIR = DATA_DIR / "media"
DATA_FILE = DATA_DIR / "notes.json"
TEMPLATES_FILE = DATA_DIR / "templates.json"

DATA_DIR.mkdir(exist_ok=True)
MEDIA_DIR.mkdir(exist_ok=True)

MAX_CONTENT_LENGTH_MB = int(os.getenv("MAX_CONTENT_LENGTH_MB", "100"))
ALLOWED_MEDIA = {
    ".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic", ".heif", ".avif",
    ".mp4", ".mov", ".avi", ".webm", ".m4v", ".mkv",
}

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = MAX_CONTENT_LENGTH_MB * 1024 * 1024


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


def read_data() -> dict[str, Any]:
    if not DATA_FILE.exists():
        data = default_data()
        write_data(data)
        return data
    try:
        return json.loads(DATA_FILE.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        backup = DATA_FILE.with_suffix(
            f".broken-{datetime.now().strftime('%Y%m%d%H%M%S')}.json"
        )
        DATA_FILE.rename(backup)
        data = default_data()
        write_data(data)
        return data


def write_data(data: dict[str, Any]) -> None:
    DATA_FILE.write_text(
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


def read_templates() -> dict[str, Any]:
    if not TEMPLATES_FILE.exists():
        data = default_templates_data()
        write_templates(data)
        return data
    try:
        data = json.loads(TEMPLATES_FILE.read_text(encoding="utf-8"))
        if ensure_official_templates(data):
            write_templates(data)
        return data
    except json.JSONDecodeError:
        backup = TEMPLATES_FILE.with_suffix(
            f".broken-{datetime.now().strftime('%Y%m%d%H%M%S')}.json"
        )
        TEMPLATES_FILE.rename(backup)
        data = default_templates_data()
        write_templates(data)
        return data


def write_templates(data: dict[str, Any]) -> None:
    TEMPLATES_FILE.write_text(
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


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/")
def index():
    return render_template("index.html")


@app.get("/api/notes")
def get_notes():
    return jsonify(read_data())


@app.post("/api/notes")
def create_note():
    payload   = request.get_json(silent=True) or {}
    parent_id = payload.get("parent_id")
    data      = read_data()

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
    write_data(data)
    return jsonify(note), 201


@app.patch("/api/notes/<note_id>")
def update_note(note_id: str):
    payload = request.get_json(silent=True) or {}
    data    = read_data()
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
    write_data(data)
    return jsonify(note)


@app.delete("/api/notes/<note_id>")
def delete_note(note_id: str):
    data = read_data()
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
    write_data(data)
    return jsonify({"deleted": list(delete_ids)})


@app.post("/api/notes/restore")
def restore_notes():
    payload = request.get_json(silent=True) or {}
    restore_items = payload.get("notes")
    insert_index = payload.get("insert_index")

    if not isinstance(restore_items, list) or not restore_items:
        return jsonify({"error": "復元するメモがありません。"}), 400

    data = read_data()
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
    write_data(data)
    return jsonify({"restored": restored})


@app.post("/api/notes/<note_id>/media")
def upload_media(note_id: str):
    data = read_data()
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
    f.save(MEDIA_DIR / stored)

    item = {
        "id":            make_id(),
        "filename":      stored,
        "original_name": f.filename,
        "mime_type":     f.content_type or "",
        "created_at":    now_iso(),
    }

    if "media" not in note:
        note["media"] = []
    note["media"].append(item)
    note["updated_at"] = now_iso()
    write_data(data)
    return jsonify(item), 201


@app.delete("/api/notes/<note_id>/media/<media_id>")
def delete_media(note_id: str, media_id: str):
    data = read_data()
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
    write_data(data)
    return jsonify({"deleted": media_id})


@app.get("/media/<path:filename>")
def serve_media(filename: str):
    return send_from_directory(MEDIA_DIR, filename)


@app.post("/api/reorder")
def reorder_notes():
    """ノードの順序と親を同時に変更する。"""
    payload   = request.get_json(silent=True) or {}
    note_id   = payload.get("note_id")
    before_id = payload.get("before_id")   # None = 対象親の末尾
    parent_id = payload.get("parent_id")   # None = ルート

    data = read_data()
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
    write_data(data)
    return jsonify(note)


@app.get("/api/templates")
def get_templates():
    data = read_templates()
    templates = sorted(
        data["templates"],
        key=lambda t: (not bool(t.get("official")), t.get("created_at", "")),
    )
    return jsonify({"templates": [template_summary(t) for t in templates]})


@app.post("/api/templates")
def create_template():
    payload = request.get_json(silent=True) or {}
    note_id = payload.get("note_id")
    name    = str(payload.get("name") or "").strip()

    if not note_id:
        return jsonify({"error": "メモが指定されていません。"}), 400
    if not name:
        return jsonify({"error": "テンプレート名を入力してください。"}), 400

    notes_data = read_data()
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

    templates_data = read_templates()
    templates_data["templates"].append(template)
    write_templates(templates_data)
    return jsonify(template_summary(template)), 201


@app.patch("/api/templates/<template_id>")
def rename_template(template_id: str):
    payload  = request.get_json(silent=True) or {}
    data     = read_templates()
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
    write_templates(data)
    return jsonify(template_summary(template))


@app.delete("/api/templates/<template_id>")
def delete_template(template_id: str):
    data     = read_templates()
    template = find_template(data, template_id)

    if not template:
        return jsonify({"error": "テンプレートが見つかりません。"}), 404
    if template.get("official"):
        return jsonify({"error": "公式テンプレートは削除できません。"}), 403

    data["templates"] = [t for t in data["templates"] if t["id"] != template_id]
    write_templates(data)
    return jsonify({"deleted": template_id})


@app.post("/api/templates/<template_id>/apply")
def apply_template(template_id: str):
    templates_data = read_templates()
    template = find_template(templates_data, template_id)
    if not template:
        return jsonify({"error": "テンプレートが見つかりません。"}), 404

    notes_data = read_data()
    created = create_notes_from_template(template["tree"], None)
    created[0]["title"] = str(template.get("name") or "新しいメモ")[:120]
    notes_data["notes"].extend(created)
    write_data(notes_data)
    return jsonify({"notes": created, "root_id": created[0]["id"]}), 201


@app.post("/api/export")
def export_notes():
    return jsonify(read_data())


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
