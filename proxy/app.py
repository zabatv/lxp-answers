#!/usr/bin/env python3
"""Мини-прокси к DeepSeek через opendeep (как AI-часть в collablab/server.py).

Браузер статического сайта не может ходить в chat.deepseek.com напрямую
(CORS + proof-of-work), поэтому запросы идут сюда. Токен chat.deepseek.com
хранится здесь в переменной окружения DEEPSEEK_API_KEY и в браузер не попадает.
"""
import hashlib
import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import opendeep as _od

def clean_token(raw):
    # в localStorage chat.deepseek.com userToken лежит как {"value": "...", "__version": "0"};
    # принимаем и такой JSON, и токен в кавычках, и с приставкой «Bearer »
    t = (raw or "").strip().strip("'")
    if t.startswith("{"):
        try:
            t = str(json.loads(t).get("value", ""))
        except Exception:  # noqa: BLE001
            pass
    t = t.strip().strip('"').strip()
    if t.lower().startswith("bearer "):
        t = t[7:].strip()
    return t


TOKEN = clean_token(os.environ.get("DEEPSEEK_API_KEY", ""))
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


def deepseek_status():
    # прямые запросы, чтобы показать настоящий ответ DeepSeek (code/msg), а не падение opendeep
    from opendeep.config import config as od_config

    def short(r):
        try:
            d = r.json()
            biz = (d.get("data") or {}).get("biz_data") if isinstance(d.get("data"), dict) else None
            return f"HTTP {r.status_code}, code {d.get('code')}, msg {d.get('msg')!r}, biz {'есть' if biz else 'нет'}"
        except Exception:  # noqa: BLE001
            return f"HTTP {r.status_code}: {r.text[:160]}"

    out = []
    try:
        gm = _od.GenerativeModel("deepseek-chat")
        h = gm._get_headers()
        r = gm.session.post(od_config.base_url + "/chat_session/create", headers=h, json={"character_id": None})
        out.append("сессия: " + short(r))
        r = gm.session.post(
            od_config.base_url + "/chat/create_pow_challenge",
            headers=h,
            json={"target_path": "/api/v0/chat/completion"},
        )
        out.append("pow: " + short(r))
    except Exception as exc:  # noqa: BLE001
        out.append(f"{type(exc).__name__}: {exc}")
    return "; ".join(out)


def explain(exc):
    # chat.deepseek.com при ошибке отвечает data: null — opendeep падает на .get()
    if isinstance(exc, AttributeError) and "NoneType" in str(exc):
        return f"DeepSeek отказал ({deepseek_status()}). Токен: {len(TOKEN)} симв."
    return f"opendeep: {exc}"


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
        self._json(200, {"ok": True, "tokenSet": bool(TOKEN), "tokenLength": len(TOKEN),
                         "tokenHash": hashlib.sha256(TOKEN.encode()).hexdigest()[:12]})

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
                self._json(502, {"error": explain(exc)})
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
            self._json(502, {"error": explain(exc)})
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
