#!/usr/bin/env python3
"""Прокси LXP AI: сайт → этот сервер → Gemini API (Google AI Studio).

Ключ Gemini хранится только здесь, в переменной окружения GEMINI_API_KEY, и в браузер не попадает.
Чат умеет инструменты: поиск по ответам сайта, выполнение кода, поиск Google.
"""
import json
import os
import re
import threading
import time
import urllib.error
import urllib.request
from collections import deque
from datetime import datetime, timezone
from hmac import compare_digest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

GEMINI_KEY = os.environ.get("GEMINI_API_KEY", "").strip()
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-3.5-flash").strip()
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
ALLOW_ORIGIN = os.environ.get("ALLOWED_ORIGIN", "*").strip() or "*"
SITE_URL = os.environ.get("SITE_URL", "https://lxp-answers.onrender.com").strip().rstrip("/")
# пароль админки задаётся только в настройках сервиса; без него админка выключена
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "")

REFINE_SYSTEM = (
    "Ты — ассистент, который правит код по просьбе пользователя. "
    "Верни ТОЛЬКО итоговый код, без markdown-ограждений и без пояснений."
)
CHAT_SYSTEM = (
    "Ты — LXP AI, помощник студента колледжа IThub (группа 2ИТП1.9.25) по учебным дисциплинам: "
    "программирование на C#, HTML/CSS, XML, дискретная математика, математическая логика, высшая математика. "
    "Отвечай по-русски, понятно и по шагам, в Markdown. Формулы пиши в LaTeX ($…$ и $$…$$). "
    "Решая задачу, используй методы и обозначения курса и проверяй ответ. Код оформляй в блоках ```."
)
TOOLS_SYSTEM = CHAT_SYSTEM + (
    " У тебя есть инструменты. Если вопрос про задание курса — сначала найди его на сайте (search_answers, "
    "потом get_answer) и объясняй тем же методом и в тех же обозначениях, что в решении сайта; "
    "в конце дай ссылку на задание в виде [название](link). Вычисления проверяй выполнением кода. "
    "Если пользователь даёт свои данные или вариант — пересчитай заново, не подгоняй под ответ сайта."
)


# ---------- статистика и журнал (в памяти, обнуляются при перезапуске) ----------
STARTED = time.time()
LOCK = threading.Lock()
STATS = {"chat": 0, "refine": 0, "errors": 0, "chatMs": 0, "chatOk": 0, "models": {}}
EVENTS = deque(maxlen=40)
FAILS = {}  # ip -> время неудачных попыток входа в админку


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


# ---------- Gemini ----------
class GeminiError(RuntimeError):
    def __init__(self, msg, status=0):
        super().__init__(msg)
        self.status = status


def gemini_call(body, model=None):
    if not GEMINI_KEY:
        raise GeminiError("LXP AI не подключён: в настройках прокси нет GEMINI_API_KEY")
    req = urllib.request.Request(
        GEMINI_URL.format(model=model or GEMINI_MODEL),
        data=json.dumps(body).encode(),
        method="POST",
        headers={"x-goog-api-key": GEMINI_KEY, "Content-Type": "application/json"},
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
        if exc.code == 429:
            detail = "лимит бесплатного ключа Gemini исчерпан — попробуй через минуту. " + detail[:160]
        raise GeminiError(f"Gemini: HTTP {exc.code} — {detail[:300]}", exc.code) from None


def to_contents(messages):
    return [
        {"role": "model" if m.get("role") == "assistant" else "user", "parts": [{"text": str(m.get("content", ""))}]}
        for m in messages[-20:] if isinstance(m, dict)
    ]


def plain_text(data):
    cand = (data.get("candidates") or [{}])[0]
    parts = (cand.get("content") or {}).get("parts") or []
    text = "".join(p.get("text", "") for p in parts if not p.get("thought"))
    if not text.strip():
        reason = cand.get("finishReason") or (data.get("promptFeedback") or {}).get("blockReason") or "пустой ответ"
        raise GeminiError(f"Gemini не ответил ({reason})")
    return text.strip()


def gemini_plain(system, messages, temperature=0.4):
    body = {
        "systemInstruction": {"parts": [{"text": system}]},
        "contents": to_contents(messages),
        "generationConfig": {"temperature": temperature},
    }
    return plain_text(gemini_call(body))


# ---------- инструменты: ответы сайта ----------
_ANSWERS = {"t": 0, "data": None}


def site_answers():
    """answers.json со сайта (выгружается при сборке), кэш 10 минут."""
    if _ANSWERS["data"] is None or time.time() - _ANSWERS["t"] > 600:
        with urllib.request.urlopen(SITE_URL + "/answers.json", timeout=20) as r:
            _ANSWERS["data"] = json.loads(r.read().decode("utf-8"))
            _ANSWERS["t"] = time.time()
    return _ANSWERS["data"]


def _words(text):
    # грубая основа слова: «матрицы», «матрицу» → «матриц»
    return [w[:6] for w in re.findall(r"[a-zа-яё0-9#+]+", text.lower().replace("ё", "е")) if len(w) >= 3 or w.isdigit()]


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
            if a["id"] != aid:
                continue
            budget, files = 30000, []
            for f in a["files"]:
                code = f["code"][: max(0, min(8000, budget))]
                budget -= len(code)
                files.append({"name": f["name"], "lang": f["lang"], "code": code, "truncated": len(code) < len(f["code"])})
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
WEB_TOOL = {"googleSearch": {}}


def gemini_tools(messages, web=False):
    """Диалог с инструментами. Возвращает текст в Markdown."""
    contents = to_contents(messages)
    tools = [SITE_TOOLS, {"codeExecution": {}}] + ([WEB_TOOL] if web else [])
    out, checks, sources, used, notes = [], [], [], [], []
    for _ in range(6):  # модель может несколько раз подряд вызвать функции
        body = {
            "systemInstruction": {"parts": [{"text": TOOLS_SYSTEM}]},
            "contents": contents,
            "tools": tools,
            # без этого Gemini не даёт смешивать встроенные инструменты (код, поиск) с нашими функциями
            "toolConfig": {"includeServerSideToolInvocations": True},
        }
        try:
            data = gemini_call(body)
        except GeminiError as exc:
            if WEB_TOOL in tools and exc.status in (400, 429):
                tools = [t for t in tools if t != WEB_TOOL]
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
            src = chunk.get("web") or {}
            if src.get("uri") and src not in sources:
                sources.append(src)
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
    if not text:
        raise GeminiError("Gemini не ответил — попробуй переформулировать вопрос")
    if checks:  # код, которым модель проверяла вычисления, — в конце, чтобы не мешал читать
        text += "\n\n---\n\n**Проверка кодом**\n\n" + "\n\n".join(checks)
    if sources:
        text += "\n\n**Источники:** " + " · ".join(f"[{s.get('title') or s['uri']}]({s['uri']})" for s in sources[:6])
    if notes:
        text += "\n\n" + "\n".join(notes)
    if used:
        record("tools", True, model="gemini", detail="; ".join(used))
    return text.strip()


def chat(messages, mode, web=False):
    if mode == "fast" and not web:
        return gemini_plain(CHAT_SYSTEM, messages)
    return gemini_tools(messages, web=web)


def refine(code, lang, instruction):
    user = f"Язык: {lang}.\n\nВот код:\n{code}\n\nЗадача: {instruction}"
    return gemini_plain(REFINE_SYSTEM, [{"role": "user", "content": user}], temperature=0.2)


# ---------- админка ----------
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
    if compare_digest(password.encode(), ADMIN_PASSWORD.encode()):
        with LOCK:
            FAILS.pop(ip, None)
        return None
    time.sleep(1)
    with LOCK:
        FAILS.setdefault(ip, []).append(t)
    return "неверный пароль админки"


def admin_status():
    with LOCK:
        stats = json.loads(json.dumps(STATS))
        events = list(EVENTS)
    return {
        "ok": True,
        "uptime": int(time.time() - STARTED),
        "startedAt": datetime.fromtimestamp(STARTED, timezone.utc).isoformat(timespec="seconds"),
        "gemini": {"on": bool(GEMINI_KEY), "model": GEMINI_MODEL},
        "origin": ALLOW_ORIGIN,
        "site": SITE_URL,
        "stats": {**stats, "avgChatMs": stats["chatMs"] // stats["chatOk"] if stats["chatOk"] else 0},
        "events": events,
    }


class Handler(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", ALLOW_ORIGIN)
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _json(self, status, obj):
        data = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self._cors()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _ip(self):
        fwd = self.headers.get("X-Forwarded-For", "")
        return fwd.split(",")[0].strip() if fwd else self.client_address[0]

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_GET(self):
        self._json(200, {"ok": True, "ai": "gemini", "geminiSet": bool(GEMINI_KEY), "model": GEMINI_MODEL})

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
        elif path == "/api/chat":
            self._chat(body)
        else:
            self._refine(body)

    def _chat(self, body):
        messages = body.get("messages")
        if not isinstance(messages, list) or not messages:
            self._json(400, {"error": "empty messages"})
            return
        mode = "fast" if body.get("model") == "fast" else "tools"
        web = bool(body.get("web"))
        t0 = time.time()
        try:
            text = chat(messages, mode, web)
        except Exception as exc:  # noqa: BLE001
            ms = int((time.time() - t0) * 1000)
            record("chat", False, ms, mode, str(exc))
            self._json(502, {"error": str(exc)})
            return
        record("chat", True, int((time.time() - t0) * 1000), mode + (" + Google" if web else ""))
        self._json(200, {"text": text, "via": "Gemini"})

    def _refine(self, body):
        instruction = str(body.get("instruction", "")).strip()
        if not instruction:
            self._json(400, {"error": "empty instruction"})
            return
        t0 = time.time()
        try:
            text = refine(str(body.get("code", "")), str(body.get("lang", "text")), instruction)
        except Exception as exc:  # noqa: BLE001
            record("refine", False, int((time.time() - t0) * 1000), "refine", str(exc))
            self._json(502, {"error": str(exc)})
            return
        record("refine", True, int((time.time() - t0) * 1000), "refine")
        self._json(200, {"text": text, "via": "Gemini"})

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
            t0 = time.time()
            try:
                answer = gemini_plain(CHAT_SYSTEM, [{"role": "user", "content": "Ответь одним коротким предложением: ты на связи?"}])
                ok, why = True, f"Gemini ({GEMINI_MODEL}) отвечает"
            except Exception as exc:  # noqa: BLE001
                answer, ok, why = "", False, str(exc)
            ms = int((time.time() - t0) * 1000)
            record("check", ok, ms, GEMINI_MODEL, "" if ok else why)
            self._json(200, {"ok": ok, "detail": why, "answer": answer, "ms": ms})
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
    print(f"LXP AI proxy on :{port}; gemini key set: {bool(GEMINI_KEY)}; model: {GEMINI_MODEL}; origin: {ALLOW_ORIGIN}")
    srv.serve_forever()


if __name__ == "__main__":
    main()
