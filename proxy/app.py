#!/usr/bin/env python3
"""Мини-прокси к DeepSeek через opendeep (как AI-часть в collablab/server.py).

Браузер статического сайта не может ходить в chat.deepseek.com напрямую
(CORS + proof-of-work), поэтому запросы идут сюда. Токен chat.deepseek.com
хранится здесь в переменной окружения DEEPSEEK_API_KEY и в браузер не попадает.
"""
import hashlib
import hmac
import json
import os
import threading
import time
import urllib.request
from collections import deque
from datetime import datetime, timezone
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


# ---------- админка ----------
# Пароль админки задаётся только в настройках сервиса (ADMIN_PASSWORD) — в коде его нет.
# Без этой переменной админка выключена.
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "")
# Необязательно: ключ Render API — тогда новый токен сохраняется в настройках сервиса
# и переживает перезапуск. Без него токен из админки действует до перезапуска сервера.
RENDER_API_KEY = os.environ.get("RENDER_API_KEY", "").strip()
RENDER_SERVICE_ID = os.environ.get("RENDER_SERVICE_ID", "").strip()  # Render задаёт сам

STARTED = time.time()
LOCK = threading.Lock()
STATS = {"chat": 0, "refine": 0, "errors": 0, "chatMs": 0, "chatOk": 0, "models": {}}
EVENTS = deque(maxlen=40)  # последние запросы и ошибки
FAILS = {}  # ip -> время неудачных попыток входа


def now_iso():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def record(kind, ok, ms=0, model="", detail=""):
    with LOCK:
        if kind in ("chat", "refine"):
            STATS[kind] += 1
            if kind == "chat" and ok:
                STATS["chatOk"] += 1
                STATS["chatMs"] += ms
            if model:
                STATS["models"][model] = STATS["models"].get(model, 0) + 1
        if not ok:
            STATS["errors"] += 1
        EVENTS.appendleft({"t": now_iso(), "kind": kind, "ok": ok, "ms": ms, "model": model, "detail": detail[:300]})


def check_admin(ip, password):
    """None — пускаем, иначе текст ошибки. После 5 неудач за 10 минут — пауза."""
    if not ADMIN_PASSWORD:
        return "админка выключена: в настройках прокси не задан ADMIN_PASSWORD"
    t = time.time()
    with LOCK:
        recent = [x for x in FAILS.get(ip, []) if t - x < 600]
        FAILS[ip] = recent
        if len(recent) >= 5:
            return "слишком много попыток — подожди 10 минут"
    if hmac.compare_digest(password.encode(), ADMIN_PASSWORD.encode()):
        with LOCK:
            FAILS.pop(ip, None)
        return None
    time.sleep(1)
    with LOCK:
        FAILS.setdefault(ip, []).append(t)
    return "неверный пароль админки"


def token_hash(t):
    return hashlib.sha256(t.encode()).hexdigest()[:12] if t else ""


def probe_token(token):
    """Проверяет токен у DeepSeek: (годен?, пояснение)."""
    from opendeep.config import config as od_config

    try:
        gm = _od.GenerativeModel("deepseek-chat")
        saved = od_config.api_key
        od_config.api_key = token
        try:
            h = gm._get_headers()
        finally:
            od_config.api_key = saved
        r = gm.session.post(od_config.base_url + "/chat_session/create", headers=h, json={"character_id": None})
        d = r.json()
        biz = (d.get("data") or {}).get("biz_data") if isinstance(d.get("data"), dict) else None
        if biz:
            return True, "DeepSeek принял токен"
        return False, f"DeepSeek: code {d.get('code')}, {d.get('msg')}"
    except Exception as exc:  # noqa: BLE001
        return False, f"{type(exc).__name__}: {exc}"


def persist_token(token):
    """Сохраняет DEEPSEEK_API_KEY в настройках сервиса на Render (если задан RENDER_API_KEY)."""
    if not (RENDER_API_KEY and RENDER_SERVICE_ID):
        return False, "действует до перезапуска сервера — чтобы навсегда, обнови DEEPSEEK_API_KEY в Render"
    req = urllib.request.Request(
        f"https://api.render.com/v1/services/{RENDER_SERVICE_ID}/env-vars/DEEPSEEK_API_KEY",
        data=json.dumps({"value": token}).encode(),
        method="PUT",
        headers={"Authorization": f"Bearer {RENDER_API_KEY}", "Content-Type": "application/json",
                 "Accept": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return 200 <= r.status < 300, "сохранён в настройках Render"
    except Exception as exc:  # noqa: BLE001
        return False, f"не удалось сохранить в Render: {exc}"


def set_token(token):
    global TOKEN
    TOKEN = token
    _od.configure(api_key=token)


def admin_status():
    with LOCK:
        stats = json.loads(json.dumps(STATS))
        events = list(EVENTS)
    return {
        "ok": True,
        "uptime": int(time.time() - STARTED),
        "startedAt": datetime.fromtimestamp(STARTED, timezone.utc).isoformat(timespec="seconds"),
        "token": {"set": bool(TOKEN), "length": len(TOKEN), "hash": token_hash(TOKEN)},
        "persist": bool(RENDER_API_KEY and RENDER_SERVICE_ID),
        "origin": ALLOW_ORIGIN,
        "stats": {**stats, "avgChatMs": stats["chatMs"] // stats["chatOk"] if stats["chatOk"] else 0},
        "events": events,
    }


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
        if path not in ("/api/refine", "/api/chat") and not path.startswith("/api/admin/"):
            self._json(404, {"error": "not found"})
            return
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length).decode("utf-8"))
        except Exception:  # noqa: BLE001
            self._json(400, {"error": "bad json"})
            return

        if path.startswith("/api/admin/"):
            self._admin(path[len("/api/admin/"):], body)
            return

        if path == "/api/chat":
            messages = body.get("messages")
            if not isinstance(messages, list) or not messages:
                self._json(400, {"error": "empty messages"})
                return
            model = str(body.get("model", "deepseek-chat"))
            t0 = time.time()
            try:
                text = chat(messages, model)
            except Exception as exc:  # noqa: BLE001
                err = explain(exc)
                record("chat", False, int((time.time() - t0) * 1000), model, err)
                self._json(502, {"error": err})
                return
            record("chat", True, int((time.time() - t0) * 1000), model)
            self._json(200, {"text": text})
            return

        instruction = str(body.get("instruction", "")).strip()
        if not instruction:
            self._json(400, {"error": "empty instruction"})
            return

        code = str(body.get("code", ""))
        lang = str(body.get("lang", "text"))
        model = str(body.get("model", "deepseek-chat"))

        t0 = time.time()
        try:
            text = generate(code, lang, instruction, model)
        except Exception as exc:  # noqa: BLE001
            err = explain(exc)
            record("refine", False, int((time.time() - t0) * 1000), model, err)
            self._json(502, {"error": err})
            return
        record("refine", True, int((time.time() - t0) * 1000), model)
        self._json(200, {"text": text})

    def _ip(self):
        fwd = self.headers.get("X-Forwarded-For", "")
        return fwd.split(",")[0].strip() if fwd else self.client_address[0]

    def _admin(self, action, body):
        denied = check_admin(self._ip(), str(body.get("password", "")))
        if denied:
            if "выключена" not in denied:
                record("admin", False, detail=f"вход в админку: {denied}")
            self._json(429 if "попыток" in denied else 401, {"error": denied})
            return

        if action == "status":
            self._json(200, admin_status())
        elif action == "check":
            # проверка «вживую»: токен у DeepSeek + короткий ответ модели
            ok, why = probe_token(TOKEN) if TOKEN else (False, "токен не задан")
            answer, ms = "", 0
            if ok:
                t0 = time.time()
                try:
                    answer = chat([{"role": "user", "content": "Ответь одним коротким предложением: ты на связи?"}],
                                  "deepseek-chat")
                except Exception as exc:  # noqa: BLE001
                    ok, why = False, explain(exc)
                ms = int((time.time() - t0) * 1000)
            record("check", ok, ms, "deepseek-chat", "" if ok else why)
            self._json(200, {"ok": ok, "detail": why, "answer": answer, "ms": ms})
        elif action == "token":
            token = clean_token(str(body.get("token", "")))
            if len(token) < 20:
                self._json(400, {"error": "это не похоже на токен — нужно значение userToken (value)"})
                return
            ok, why = probe_token(token)
            if not ok:
                self._json(400, {"error": f"токен не принят, старый оставлен: {why}"})
                return
            set_token(token)
            saved, note = persist_token(token)
            record("token", True, detail=f"токен заменён (отпечаток {token_hash(token)}); {note}")
            self._json(200, {"ok": True, "detail": why, "persisted": saved, "note": note,
                             "token": {"length": len(token), "hash": token_hash(token)}})
        elif action == "clear":
            with LOCK:
                EVENTS.clear()
                STATS.update({"chat": 0, "refine": 0, "errors": 0, "chatMs": 0, "chatOk": 0, "models": {}})
            self._json(200, {"ok": True})
        else:
            self._json(404, {"error": "unknown admin action"})

    def log_message(self, *args):  # тише в логах
        return


def main():
    port = int(os.environ.get("PORT", "8000"))
    srv = ThreadingHTTPServer(("0.0.0.0", port), Handler)
    print(f"DeepSeek proxy on :{port}; token set: {bool(TOKEN)}; origin: {ALLOW_ORIGIN}")
    srv.serve_forever()


if __name__ == "__main__":
    main()
