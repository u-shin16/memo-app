from __future__ import annotations

import json
import os
from pathlib import Path

from google import genai
from google.genai import types as genai_types
from dotenv import load_dotenv
from flask import Flask, render_template, request, jsonify

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent
app = Flask(__name__)

_USE_VERTEX_AI = os.getenv("USE_VERTEX_AI", "false").lower() == "true"
_GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash-lite")

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


@app.get("/")
def index():
    return render_template("index.html")


@app.get("/auth/action")
def auth_action():
    return render_template("auth_action.html")


@app.post("/api/ai-note")
def api_ai_note():
    data = request.get_json(silent=True) or {}
    prompt = str(data.get("prompt", "")).strip()
    if not prompt:
        return jsonify(error="prompt is required"), 400

    try:
        client = create_gemini_client()
        response = client.models.generate_content(
            model=_GEMINI_MODEL,
            contents=_NOTE_PROMPT.format(prompt=prompt),
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
    data = request.get_json(silent=True) or {}
    prompt = str(data.get("prompt", "")).strip()
    if not prompt:
        return jsonify(error="prompt is required"), 400

    try:
        client = create_gemini_client()
        response = client.models.generate_content(
            model=_GEMINI_MODEL,
            contents=_MINDMAP_PROMPT.format(prompt=prompt),
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
    port = int(os.getenv("PORT", "5002"))
    app.run(debug=True, port=port)
