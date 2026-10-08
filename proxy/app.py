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


# ---------- запасные провайдеры (OpenAI-совместимый API) ----------
# Ключи задаются только в настройках сервиса. Провайдер без ключа просто не используется.
PROVIDERS = {
    "gemini": {
        "name": "Gemini",
        "url": "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
        "key": os.environ.get("GEMINI_API_KEY", "").strip(),
        "model": os.environ.get("GEMINI_MODEL", "gemini-3.5-flash").strip(),
    },
    "groq": {
        "name": "Groq",
        "url": "https://api.groq.com/openai/v1/chat/completions",
        "key": os.environ.get("GROQ_API_KEY", "").strip(),
        "model": os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile").strip(),
    },
    "openrouter": {
        "name": "OpenRouter",
        "url": "https://openrouter.ai/api/v1/chat/completions",
        "key": os.environ.get("OPENROUTER_API_KEY", "").strip(),
        "model": os.environ.get("OPENROUTER_MODEL", "meta-llama/llama-3.3-70b-instruct:free").strip(),
    },
}
# если DeepSeek не ответил — пробуем по очереди настроенных провайдеров
FALLBACK = os.environ.get("AI_FALLBACK", "1").strip() != "0"


def active_providers():
    return [k for k, p in PROVIDERS.items() if p["key"]]


def provider_chat(pid, system, turns, temperature=0.4):
    p = PROVIDERS[pid]
    msgs = [{"role": "system", "content": system}] + [
        {"role": "assistant" if m.get("role") == "assistant" else "user", "content": str(m.get("content", ""))}
        for m in turns
    ]
    req = urllib.request.Request(
        p["url"],
        data=json.dumps({"model": p["model"], "messages": msgs, "temperature": temperature}).encode(),
        method="POST",
        headers={"Authorization": f"Bearer {p['key']}", "Content-Type": "application/json",
                 "HTTP-Referer": "https://lxp-answers.onrender.com", "X-Title": "LXP AI"},
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            data = json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        raise RuntimeError(f"{p['name']}: HTTP {exc.code} {exc.read().decode('utf-8', 'ignore')[:200]}") from None
    return (data["choices"][0]["message"].get("content") or "").strip()


# ---------- Gemini с инструментами: поиск по ответам сайта, выполнение кода, поиск Google ----------
SITE_URL = os.environ.get("SITE_URL", "https://lxp-answers.onrender.com").strip().rstrip("/")
_ANSWERS = {"t": 0, "data": None}


def site_answers():
    """answers.json со сайта (выгружается при сборке), кэш 10 минут."""
    if _ANSWERS["data"] is None or time.time() - _ANSWERS["t"] > 600:
        with urllib.request.urlopen(SITE_URL + "/answers.json", timeout=20) as r:
            _ANSWERS["data"] = json.loads(r.read().decode("utf-8"))
            _ANSWERS["t"] = time.time()
    return _ANSWERS["data"]


def _words(text):
    import re

    out = []
    for w in re.findall(r"[a-zа-яё0-9#+]+", text.lower().replace("ё", "е")):
        if len(w) >= 3 or w.isdigit():
            out.append(w[:6])  # грубая основа слова: «матрицы», «матрицу» → «матриц»
    return out


def search_answers(query, limit=6):
    q = set(_words(query))
    if not q:
        return []
    found = []
    for d in site_answers()["disciplines"]:
        dn = set(_words(d["name"]))
        for a in d["answers"]:
            fields = (
                (3, a["title"]),
                (2, a["task"]),
                (1, " ".join(f["name"] for f in a["files"])),
                (0.3, " ".join(f["code"][:3000] for f in a["files"])),
            )
            score = sum(w * len(q & set(_words(t))) for w, t in fields) + 2 * len(q & dn)
            if score:
                found.append((score, d, a))
    found.sort(key=lambda x: -x[0])
    return [
        {"id": f"{d['id']}::{a['id']}", "discipline": d["name"], "title": a["title"], "task": a["task"][:300],
         "points": a["points"], "files": [f["name"] for f in a["files"]]}
        for _, d, a in found[:limit]
    ]


def get_answer(answer_id):
    did, _, aid = str(answer_id).partition("::")
    for d in site_answers()["disciplines"]:
        if d["id"] != did:
            continue
        for a in d["answers"]:
            if a["id"] == aid:
                budget, files = 30000, []
                for f in a["files"]:
                    code = f["code"][: max(0, min(8000, budget))]
                    budget -= len(code)
                    files.append({"name": f["name"], "lang": f["lang"], "code": code,
                                  "truncated": len(code) < len(f["code"])})
                return {"id": answer_id, "discipline": d["name"], "teacher": d["teacher"], "title": a["title"],
                        "task": a["task"], "note": a["note"], "unique": a["unique"], "points": a["points"],
                        "link": f"#/{did}/{aid}", "files": files}
    return {"error": f"задание {answer_id} не найдено"}


SITE_TOOLS = {"functionDeclarations": [
    {
        "name": "search_answers",
        "description": "Ищет задания с готовыми решениями на сайте студента (по названию, условию, файлам). "
                       "Вызывай, когда вопрос похож на задание из курса: КТ, практическая, тема дисциплины.",
        "parameters": {"type": "object", "properties": {
            "query": {"type": "string", "description": "ключевые слова по-русски, напр. «обратная матрица КТ»"}},
            "required": ["query"]},
    },
    {
        "name": "get_answer",
        "description": "Возвращает задание целиком: условие, пометки и файлы решения. id берётся из search_answers.",
        "parameters": {"type": "object", "properties": {"id": {"type": "string"}}, "required": ["id"]},
    },
]}

TOOLS_SYSTEM = CHAT_SYSTEM + (
    " У тебя есть инструменты. Если вопрос про задание курса — сначала найди его на сайте (search_answers, "
    "потом get_answer) и объясняй тем же методом и в тех же обозначениях, что в решении сайта; "
    "в конце дай ссылку на задание в виде [название](link). Вычисления проверяй выполнением кода. "
    "Если пользователь просит свои данные/вариант — пересчитай заново, не подгоняй под ответ сайта."
)


def _gemini_call(body):
    p = PROVIDERS["gemini"]
    req = urllib.request.Request(
        f"https://generativelanguage.googleapis.com/v1beta/models/{p['model']}:generateContent",
        data=json.dumps(body).encode(),
        method="POST",
        headers={"x-goog-api-key": p["key"], "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=150) as r:
            return json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", "ignore")
        try:
            detail = json.loads(detail)["error"]["message"]
        except Exception:  # noqa: BLE001
            pass
        err = RuntimeError(f"Gemini: HTTP {exc.code} — {detail[:240]}")
        err.status = exc.code
        raise err from None


def gemini_tools_chat(messages, web=False):
    """Диалог с Gemini и инструментами. Возвращает (текст markdown, кто ответил)."""
    if not PROVIDERS["gemini"]["key"]:
        raise RuntimeError("Gemini не подключён (нет GEMINI_API_KEY в настройках прокси)")
    contents = [
        {"role": "model" if m.get("role") == "assistant" else "user", "parts": [{"text": str(m.get("content", ""))}]}
        for m in messages[-20:] if isinstance(m, dict)
    ]
    tools = [SITE_TOOLS, {"codeExecution": {}}]
    notes = []
    if web:
        tools.append({"googleSearch": {}})
    out, checks, sources, used = [], [], [], []
    for _ in range(6):  # модель может несколько раз подряд вызвать функции
        body = {
            "systemInstruction": {"parts": [{"text": TOOLS_SYSTEM}]},
            "contents": contents,
            "tools": tools,
            # без этого Gemini не даёт смешивать встроенные инструменты (код, поиск) с нашими функциями
            "toolConfig": {"includeServerSideToolInvocations": True},
        }
        try:
            data = _gemini_call(body)
        except RuntimeError as exc:
            if web and getattr(exc, "status", 0) in (400, 429) and {"googleSearch": {}} in tools:
                tools = [t for t in tools if t != {"googleSearch": {}}]
                notes.append("_Поиск Google сейчас недоступен на этом ключе — ответ без него._")
                continue
            raise
        cand = (data.get("candidates") or [{}])[0]
        content = cand.get("content") or {"role": "model", "parts": []}
        parts = content.get("parts") or []
        calls = [p["functionCall"] for p in parts if "functionCall" in p]
        for p in parts:
            if "executableCode" in p:
                checks.append(f"```python\n{p['executableCode'].get('code', '').strip()}\n```")
            elif "codeExecutionResult" in p:
                res = (p["codeExecutionResult"].get("output") or "").strip()
                if res:
                    checks.append(f"Вывод:\n```\n{res}\n```")
            elif "text" in p and not p.get("thought") and not calls:
                out.append(p["text"].strip())
        for chunk in (cand.get("groundingMetadata") or {}).get("groundingChunks", []) or []:
            web_src = chunk.get("web") or {}
            if web_src.get("uri") and web_src not in sources:
                sources.append(web_src)
        if not calls:
            break
        contents.append(content)  # вместе с thoughtSignature — Gemini этого требует
        responses = []
        for c in calls:
            args = c.get("args") or {}
            try:
                if c.get("name") == "search_answers":
                    result = {"results": search_answers(args.get("query", ""))}
                    used.append(f"поиск: {args.get('query', '')}")
                elif c.get("name") == "get_answer":
                    result = get_answer(args.get("id", ""))
                    used.append(f"задание: {args.get('id', '')}")
                else:
                    result = {"error": "нет такой функции"}
            except Exception as exc:  # noqa: BLE001
                result = {"error": f"не удалось получить ответы сайта: {exc}"}
            responses.append({"functionResponse": {"name": c.get("name"), "response": result}})
        contents.append({"role": "user", "parts": responses})
    text = "\n\n".join(x for x in out if x)
    if checks:  # код, которым модель проверяла вычисления, — в конце, чтобы не мешал читать
        text += "\n\n---\n\n**Проверка кодом**\n\n" + "\n\n".join(checks)
    if sources:
        text += "\n\n**Источники:** " + " · ".join(f"[{s.get('title') or s['uri']}]({s['uri']})" for s in sources[:6])
    if notes:
        text += "\n\n" + "\n".join(notes)
    if used:
        record("tools", True, model="gemini", detail="; ".join(used))
    return text.strip(), "Gemini + инструменты"


def with_fallback(model, deepseek_call, provider_call):
    """Возвращает (текст, кто ответил). Модель-провайдер — сразу к нему; DeepSeek — с запасным вариантом."""
    if model in PROVIDERS:
        if not PROVIDERS[model]["key"]:
            raise RuntimeError(f"{PROVIDERS[model]['name']} не подключён (нет ключа в настройках прокси)")
        return provider_call(model), PROVIDERS[model]["name"]
    try:
        return deepseek_call(model if model in VALID_MODELS else "deepseek-chat"), "DeepSeek"
    except Exception as exc:  # noqa: BLE001
        first = exc
    if FALLBACK:
        for pid in active_providers():
            try:
                return provider_call(pid), PROVIDERS[pid]["name"]
            except Exception as exc:  # noqa: BLE001
                record("fallback", False, model=pid, detail=str(exc))
    raise first


def _ds_chat(messages, model):
    gm = _od.GenerativeModel(model)
    resp = gm.generate_content(chat_prompt(messages), thinking_enabled=(model == "deepseek-reasoner"))
    return (resp.text or "").strip()


def chat(messages, model):
    turns = [m for m in messages[-20:] if isinstance(m, dict)]
    return with_fallback(model, lambda ds: _ds_chat(messages, ds), lambda pid: provider_chat(pid, CHAT_SYSTEM, turns))


def generate(code, lang, instruction, model):
    def ds(m):
        gm = _od.GenerativeModel(m)
        resp = gm.generate_content(build_prompt(code, lang, instruction), thinking_enabled=False)
        return (resp.text or "").strip()

    user = f"Язык: {lang}.\n\nВот код:\n{code}\n\nЗадача: {instruction}"
    return with_fallback(model, ds, lambda pid: provider_chat(pid, SYSTEM, [{"role": "user", "content": user}], 0.2))


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
        "providers": [{"id": k, "name": p["name"], "model": p["model"], "on": bool(p["key"])} for k, p in PROVIDERS.items()],
        "fallback": FALLBACK,
        "origin": ALLOW_ORIGIN,
        "stats": {**stats, "avgChatMs": stats["chatMs"] // stats["chatOk"] if stats["chatOk"] else 0},
        "events": events,
    }


def explain(exc):
    # chat.deepseek.com при ошибке отвечает data: null — opendeep падает на .get()
    if isinstance(exc, AttributeError) and "NoneType" in str(exc):
        return f"DeepSeek отказал ({deepseek_status()}). Токен: {len(TOKEN)} симв."
    if isinstance(exc, RuntimeError):  # наши понятные ошибки (провайдеры, нет ключа)
        return str(exc)
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
                         "tokenHash": hashlib.sha256(TOKEN.encode()).hexdigest()[:12],
                         "providers": [{"id": k, "name": PROVIDERS[k]["name"]} for k in active_providers()]})

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
                if model == "gemini-tools" or body.get("web"):
                    text, via = gemini_tools_chat(messages, web=bool(body.get("web")))
                else:
                    text, via = chat(messages, model)
            except Exception as exc:  # noqa: BLE001
                err = explain(exc)
                record("chat", False, int((time.time() - t0) * 1000), model, err)
                self._json(502, {"error": err})
                return
            record("chat", True, int((time.time() - t0) * 1000), model, "" if via == "DeepSeek" else f"ответил {via}")
            self._json(200, {"text": text, "via": via})
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
            text, via = generate(code, lang, instruction, model)
        except Exception as exc:  # noqa: BLE001
            err = explain(exc)
            record("refine", False, int((time.time() - t0) * 1000), model, err)
            self._json(502, {"error": err})
            return
        record("refine", True, int((time.time() - t0) * 1000), model, "" if via == "DeepSeek" else f"ответил {via}")
        self._json(200, {"text": text, "via": via})

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
            target = str(body.get("model", "deepseek-chat"))
            question = [{"role": "user", "content": "Ответь одним коротким предложением: ты на связи?"}]
            if target in PROVIDERS:
                ok, why = (True, f"{PROVIDERS[target]['name']} подключён") if PROVIDERS[target]["key"] \
                    else (False, f"{PROVIDERS[target]['name']}: нет ключа")
            else:
                ok, why = probe_token(TOKEN) if TOKEN else (False, "токен DeepSeek не задан")
            answer, ms = "", 0
            if ok:
                t0 = time.time()
                try:
                    if target in PROVIDERS:
                        answer = provider_chat(target, CHAT_SYSTEM, question)
                    else:
                        answer = _ds_chat(question, "deepseek-chat")
                except Exception as exc:  # noqa: BLE001
                    ok, why = False, explain(exc)
                ms = int((time.time() - t0) * 1000)
            record("check", ok, ms, target, "" if ok else why)
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
