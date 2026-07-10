from __future__ import annotations

import json
import os
import zipfile
from io import BytesIO
from pathlib import Path

from google import genai
from google.genai import types as genai_types
from dotenv import load_dotenv
from flask import Flask, render_template, request, jsonify
from docx import Document
from openpyxl import load_workbook
from pypdf import PdfReader

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent
app = Flask(__name__)

_USE_VERTEX_AI = os.getenv("USE_VERTEX_AI", "false").lower() == "true"
_GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash-lite")
_AI_FILE_MAX_BYTES = 10 * 1024 * 1024
_AI_FILE_TEXT_MAX_CHARS = 100_000
_AI_OFFICE_MAX_UNCOMPRESSED_BYTES = 50 * 1024 * 1024
_AI_DOCUMENT_EXTENSIONS = {".txt", ".md", ".csv", ".json", ".pdf", ".docx", ".xlsx"}
_AI_IMAGE_MIME_TYPES = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".heic": "image/heic",
    ".heif": "image/heif",
}
_AI_FILE_EXTENSIONS = _AI_DOCUMENT_EXTENSIONS | set(_AI_IMAGE_MIME_TYPES)

app.config["MAX_CONTENT_LENGTH"] = _AI_FILE_MAX_BYTES + (512 * 1024)

_NOTE_PROMPT = """\
あなたは階層型メモ生成AIです。与えられたテーマをもとに、階層構造のメモをJSON形式で生成してください。

出力はJSONオブジェクトのみ（マークダウンコードブロックや説明文は不要）:
{{
  "title": "ルートメモのタイトル",
  "content": "ルートメモの内容（概要や導入文）",
  "children": [
    {{
      "title": "セクション見出し",
      "content": "このセクションの詳細な内容",
      "children": [
        {{
          "title": "サブ項目",
          "content": "サブ項目の内容",
          "children": []
        }}
      ]
    }}
  ]
}}

ルール:
- 入力と同じ言語で出力する
- ルート: テーマ全体のタイトルと概要
- セクション: 3〜5個のメインセクション
- 各セクション: 具体的な説明文を content に記載
- サブ項目: 必要に応じて1〜3個
- content は文章で書く（箇条書き不可）
- 出力: JSONオブジェクトのみ

テーマ：{prompt}"""

_MINDMAP_PROMPT = """\
あなたはマインドマップ生成AIです。与えられたテーマや内容をもとに、マインドマップをJSON形式で生成してください。

出力はJSONオブジェクトのみ（マークダウンコードブロックや説明文は不要）:
{{
  "title": "ルートノードのタイトル",
  "memo": "",
  "children": [
    {{
      "title": "ブランチ",
      "memo": "",
      "children": [
        {{ "title": "サブ項目", "memo": "", "children": [] }}
      ]
    }}
  ]
}}

ルール:
- 入力と同じ言語で出力する（日本語入力→日本語ノード）
- ルートタイトル：簡潔に（15文字以内推奨）
- メインブランチ：3〜6個
- 各ブランチのサブ項目：1〜4個
- 最大深さ：ルート＋2レベル
- ノードタイトル：短く明確に（20文字以内推奨）
- 出力：JSONオブジェクトのみ

テーマ・内容：{prompt}"""


def create_gemini_client():
    if _USE_VERTEX_AI:
        project = os.getenv("GOOGLE_CLOUD_PROJECT", "")
        location = os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1")
        if not project:
            raise RuntimeError("GOOGLE_CLOUD_PROJECT が設定されていません")
        return genai.Client(vertexai=True, project=project, location=location)

    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY が設定されていません")
    return genai.Client(api_key=api_key)


def _decode_text_file(data: bytes) -> str:
    for encoding in ("utf-8-sig", "utf-8", "cp932"):
        try:
            return data.decode(encoding)
        except UnicodeDecodeError:
            continue
    raise ValueError("ファイルの文字コードを読み取れませんでした。UTF-8形式で保存してください。")


def _validate_office_archive(data: bytes) -> None:
    try:
        with zipfile.ZipFile(BytesIO(data)) as archive:
            total_size = sum(info.file_size for info in archive.infolist())
    except zipfile.BadZipFile as exc:
        raise ValueError("Officeファイルが破損しているか、形式が正しくありません。") from exc
    if total_size > _AI_OFFICE_MAX_UNCOMPRESSED_BYTES:
        raise ValueError("展開後のファイルサイズが大きすぎます。")


def _extract_pdf_text(data: bytes) -> str:
    reader = PdfReader(BytesIO(data))
    if reader.is_encrypted:
        try:
            unlocked = reader.decrypt("")
        except Exception as exc:
            raise ValueError("パスワード付きPDFは読み込めません。") from exc
        if not unlocked:
            raise ValueError("パスワード付きPDFは読み込めません。")
    return "\n\n".join(page.extract_text() or "" for page in reader.pages)


def _extract_docx_text(data: bytes) -> str:
    _validate_office_archive(data)
    document = Document(BytesIO(data))
    chunks = [paragraph.text for paragraph in document.paragraphs if paragraph.text.strip()]
    for table in document.tables:
        for row in table.rows:
            values = [cell.text.strip() for cell in row.cells]
            if any(values):
                chunks.append("\t".join(values))
    return "\n".join(chunks)


def _extract_xlsx_text(data: bytes) -> str:
    _validate_office_archive(data)
    workbook = load_workbook(BytesIO(data), read_only=True, data_only=False)
    chunks = []
    try:
        for sheet in workbook.worksheets:
            chunks.append(f"[シート: {sheet.title}]")
            for row in sheet.iter_rows(values_only=True):
                values = ["" if value is None else str(value) for value in row]
                if any(value.strip() for value in values):
                    chunks.append("\t".join(values))
    finally:
        workbook.close()
    return "\n".join(chunks)


def _get_validated_image_mime_type(filename: str, data: bytes) -> str:
    extension = Path(filename).suffix.lower()
    mime_type = _AI_IMAGE_MIME_TYPES.get(extension)
    if not mime_type:
        raise ValueError("対応していない画像形式です。")
    if not data:
        raise ValueError("ファイルが空です。")
    if len(data) > _AI_FILE_MAX_BYTES:
        raise ValueError("ファイルサイズは10MB以下にしてください。")

    is_valid = False
    if extension == ".png":
        is_valid = data.startswith(b"\x89PNG\r\n\x1a\n")
    elif extension in {".jpg", ".jpeg"}:
        is_valid = data.startswith(b"\xff\xd8\xff")
    elif extension == ".webp":
        is_valid = len(data) >= 12 and data.startswith(b"RIFF") and data[8:12] == b"WEBP"
    else:
        heif_brands = {b"heic", b"heix", b"hevc", b"hevx", b"mif1", b"msf1"}
        is_valid = (
            len(data) >= 12
            and data[4:8] == b"ftyp"
            and data[8:12] in heif_brands
        )

    if not is_valid:
        raise ValueError("画像ファイルが破損しているか、形式が拡張子と一致しません。")
    return mime_type


def extract_ai_file_text(filename: str, data: bytes) -> str:
    extension = Path(filename).suffix.lower()
    if extension not in _AI_DOCUMENT_EXTENSIONS:
        supported = ", ".join(sorted(_AI_FILE_EXTENSIONS))
        raise ValueError(f"対応していないファイル形式です。対応形式: {supported}")
    if not data:
        raise ValueError("ファイルが空です。")
    if len(data) > _AI_FILE_MAX_BYTES:
        raise ValueError("ファイルサイズは10MB以下にしてください。")

    try:
        if extension in {".txt", ".md", ".csv"}:
            text = _decode_text_file(data)
        elif extension == ".json":
            parsed = json.loads(_decode_text_file(data))
            text = json.dumps(parsed, ensure_ascii=False, indent=2)
        elif extension == ".pdf":
            text = _extract_pdf_text(data)
        elif extension == ".docx":
            text = _extract_docx_text(data)
        else:
            text = _extract_xlsx_text(data)
    except ValueError:
        raise
    except Exception as exc:
        raise ValueError("ファイルの内容を読み取れませんでした。") from exc

    text = text.replace("\x00", "").strip()
    if not text:
        raise ValueError("ファイルから文字を抽出できませんでした。画像のみのPDFには対応していません。")
    if len(text) > _AI_FILE_TEXT_MAX_CHARS:
        text = text[:_AI_FILE_TEXT_MAX_CHARS] + "\n\n[以降は文字数上限のため省略されました]"
    return text


def get_ai_input_from_request() -> tuple[str, genai_types.Part | None]:
    if request.is_json:
        data = request.get_json(silent=True) or {}
        prompt = str(data.get("prompt", "")).strip()
        upload = None
    else:
        prompt = str(request.form.get("prompt", "")).strip()
        upload = request.files.get("file")

    file_text = ""
    filename = ""
    image_part = None
    if upload and upload.filename:
        filename = upload.filename.replace("\\", "/").rsplit("/", 1)[-1][:255]
        file_data = upload.read(_AI_FILE_MAX_BYTES + 1)
        extension = Path(filename).suffix.lower()
        if extension in _AI_IMAGE_MIME_TYPES:
            mime_type = _get_validated_image_mime_type(filename, file_data)
            image_part = genai_types.Part.from_bytes(data=file_data, mime_type=mime_type)
        else:
            file_text = extract_ai_file_text(filename, file_data)

    if not prompt and not file_text and image_part is None:
        raise ValueError("テーマを入力するか、ファイルを選択してください。")
    if image_part is not None:
        instruction = prompt or "添付画像の内容を読み取り、重要な情報を整理してください。"
        return f"依頼・テーマ:\n{instruction}\n\n添付画像: {filename}", image_part
    if not file_text:
        return prompt, None

    instruction = prompt or "添付ファイルの内容を整理してください。"
    return (
        f"依頼・テーマ:\n{instruction}\n\n"
        f"添付ファイル「{filename}」の内容:\n"
        "--- ファイル内容ここから ---\n"
        f"{file_text}\n"
        "--- ファイル内容ここまで ---"
    ), None


def build_ai_contents(prompt_template: str, prompt: str, image_part: genai_types.Part | None):
    formatted_prompt = prompt_template.format(prompt=prompt)
    if image_part is None:
        return formatted_prompt
    return [image_part, formatted_prompt]


@app.get("/")
def index():
    return render_template("index.html")


@app.get("/auth/action")
def auth_action():
    return render_template("auth_action.html")


@app.errorhandler(413)
def request_too_large(_error):
    return jsonify(error="ファイルサイズは10MB以下にしてください。"), 413


@app.post("/api/ai-note")
def api_ai_note():
    try:
        prompt, image_part = get_ai_input_from_request()
    except ValueError as e:
        return jsonify(error=str(e)), 400

    try:
        client = create_gemini_client()
        response = client.models.generate_content(
            model=_GEMINI_MODEL,
            contents=build_ai_contents(_NOTE_PROMPT, prompt, image_part),
            config=genai_types.GenerateContentConfig(
                response_mime_type="application/json",
                max_output_tokens=4096,
                temperature=0.7,
            ),
        )
        raw = response.text.strip()
        if raw.startswith("```"):
            lines = raw.splitlines()
            raw = "\n".join(lines[1:-1] if lines[-1].startswith("```") else lines[1:])
        tree = json.loads(raw)
    except Exception as e:
        return jsonify(error=str(e)), 502

    return jsonify(tree=tree)


@app.post("/api/ai-mindmap")
def api_ai_mindmap():
    try:
        prompt, image_part = get_ai_input_from_request()
    except ValueError as e:
        return jsonify(error=str(e)), 400

    try:
        client = create_gemini_client()
        response = client.models.generate_content(
            model=_GEMINI_MODEL,
            contents=build_ai_contents(_MINDMAP_PROMPT, prompt, image_part),
            config=genai_types.GenerateContentConfig(
                response_mime_type="application/json",
                max_output_tokens=2048,
                temperature=0.7,
            ),
        )
        raw = response.text.strip()
        if raw.startswith("```"):
            lines = raw.splitlines()
            raw = "\n".join(lines[1:-1] if lines[-1].startswith("```") else lines[1:])
        tree = json.loads(raw)
    except Exception as e:
        return jsonify(error=str(e)), 502

    return jsonify(tree=tree)


if __name__ == "__main__":
    port = int(os.getenv("PORT", "5003"))
    app.run(debug=True, port=port)
