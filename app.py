from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, render_template

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent
app = Flask(__name__)


@app.get("/")
def index():
    return render_template("index.html")


@app.get("/auth/action")
def auth_action():
    return render_template("auth_action.html")


if __name__ == "__main__":
    port = int(os.getenv("PORT", "5002"))
    app.run(debug=True, port=port)
