#!/usr/bin/env python3
"""Мини-прокси к DeepSeek через opendeep (как AI-часть в collablab/server.py).

Браузер статического сайта не может ходить в chat.deepseek.com напрямую
(CORS + proof-of-work), поэтому запросы идут сюда. Токен chat.deepseek.com
хранится здесь в переменной окружения DEEPSEEK_API_KEY и в браузер не попадает.
"""
import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import opendeep as _od

TOKEN = os.environ.get("DEEPSEEK_API_KEY", "").strip()
ALLOW_ORIGIN = os.environ.get("ALLOWED_ORIGIN", "*").strip() or "*"
if TOKEN:
    try:
        _od.configure(api_key=TOKEN)
    except Exception as exc:  # noqa: BLE001
        print("configure error:", exc)

VALID_MODELS = {
    "deepseek-chat",
    "deepseek-reasoner",
    "deepseek-v4-pro",
    "deepseek-v4-flash",
    "deepseek-expert",
}

SYSTEM = (
    "Ты — ассистент, который правит код по просьбе пользователя. "
    "Верни ТОЛЬКО итоговый код, без markdown-ограждений и без пояснений."
)


def build_prompt(code, lang, instruction):
    return f"{SYSTEM}\nЯзык: {lang}.\n\nВот код:\n{code}\n\nЗадача: {instruction}"


CHAT_SYSTEM = (
    "Ты — LXP AI, помощник студента колледжа IThub (группа 2ИТП1.9.25) по учебным дисциплинам: "
    "программирование на C#, HTML/CSS, XML, дискретная математика, математическая логика, высшая математика. "
    "Отвечай по-русски, понятно и по шагам. Решая задачу, используй методы и обозначения школьного/колледжского "
    "курса и проверяй ответ. Код оформляй в блоках ```."
)


def chat_prompt(messages):
    lines = [CHAT_SYSTEM, ""]
    for m in messages[-20:]:
        who = "LXP AI" if m.get("role") == "assistant" else "Студент"
        lines.append(f"{who}: {str(m.get('content', '')).strip()}")
    lines.append("LXP AI:")
    return "\n".join(lines)


def chat(messages, model):
    model = model if model in VALID_MODELS else "deepseek-chat"
    gm = _od.GenerativeModel(model)
    resp = gm.generate_content(chat_prompt(messages), thinking_enabled=(model == "deepseek-reasoner"))
    return (resp.text or "").strip()


def generate(code, lang, instruction, model):
    model = model if model in VALID_MODELS else "deepseek-chat"
    gm = _od.GenerativeModel(model)
    resp = gm.generate_content(build_prompt(code, lang, instruction), thinking_enabled=False)
    return (resp.text or "").strip()


class Handler(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", ALLOW_ORIGIN)
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _json(self, status, obj):
        data = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self._cors()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_GET(self):
        self._json(200, {"ok": True, "tokenSet": bool(TOKEN)})

    def do_POST(self):
        path = self.path.rstrip("/")
        if path not in ("/api/refine", "/api/chat"):
            self._json(404, {"error": "not found"})
            return
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length).decode("utf-8"))
        except Exception:  # noqa: BLE001
            self._json(400, {"error": "bad json"})
            return

        if path == "/api/chat":
            messages = body.get("messages")
            if not isinstance(messages, list) or not messages:
                self._json(400, {"error": "empty messages"})
                return
            try:
                text = chat(messages, str(body.get("model", "deepseek-chat")))
            except Exception as exc:  # noqa: BLE001
                self._json(502, {"error": f"opendeep: {exc}"})
                return
            self._json(200, {"text": text})
            return

        instruction = str(body.get("instruction", "")).strip()
        if not instruction:
            self._json(400, {"error": "empty instruction"})
            return

        code = str(body.get("code", ""))
        lang = str(body.get("lang", "text"))
        model = str(body.get("model", "deepseek-chat"))

        try:
            text = generate(code, lang, instruction, model)
        except Exception as exc:  # noqa: BLE001
            self._json(502, {"error": f"opendeep: {exc}"})
            return
        self._json(200, {"text": text})

    def log_message(self, *args):  # тише в логах
        return


def main():
    port = int(os.environ.get("PORT", "8000"))
    srv = ThreadingHTTPServer(("0.0.0.0", port), Handler)
    print(f"DeepSeek proxy on :{port}; token set: {bool(TOKEN)}; origin: {ALLOW_ORIGIN}")
    srv.serve_forever()


if __name__ == "__main__":
    main()
