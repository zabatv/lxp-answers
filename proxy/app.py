#!/usr/bin/env python3
"""Прокси LXP AI: сайт → этот сервер → Groq / Mistral / Gemini.

Ключи хранятся только здесь, в переменных окружения, и в браузер не попадают.
Порядок: Groq (быстрый, большой бесплатный лимит) → Mistral → Gemini. Если провайдер упёрся
в лимит или ответил ошибкой, вопрос уходит следующему. Провайдер без ключа пропускается.
Чат умеет поиск по ответам сайта (у всех), выполнение кода и поиск Google (только Gemini).
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
# Провайдеры: Groq и Mistral — OpenAI-совместимый API с большим бесплатным лимитом
PROVIDERS = {
    "groq": {
        "name": "Groq",
        "url": os.environ.get("GROQ_URL", "https://api.groq.com/openai/v1/chat/completions"),
        "key": os.environ.get("GROQ_API_KEY", "").strip(),
        "env": "GROQ_API_KEY",
    },
    "mistral": {
        "name": "Mistral",
        "url": os.environ.get("MISTRAL_URL", "https://api.mistral.ai/v1/chat/completions"),
        "key": os.environ.get("MISTRAL_API_KEY", "").strip(),
        "env": "MISTRAL_API_KEY",
    },
    "gemini": {"name": "Gemini", "key": GEMINI_KEY, "env": "GEMINI_API_KEY"},
}
# Модели, из которых пользователь выбирает под задачу. Модель без ключа провайдера скрыта.
MODELS = [
    {"id": "groq", "provider": "groq", "model": os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile").strip(),
     "name": "Llama 3.3 70B", "tag": "Groq · большой лимит"},
    {"id": "groq-fast", "provider": "groq", "model": os.environ.get("GROQ_FAST_MODEL", "llama-3.1-8b-instant").strip(),
     "name": "Llama 3.1 8B", "tag": "Groq · мгновенная"},
    {"id": "mistral", "provider": "mistral", "model": os.environ.get("MISTRAL_MODEL", "mistral-small-latest").strip(),
     "name": "Mistral Small", "tag": "Mistral · по-русски"},
    {"id": "codestral", "provider": "mistral", "model": os.environ.get("CODESTRAL_MODEL", "codestral-latest").strip(),
     "name": "Codestral", "tag": "Mistral · для кода"},
    {"id": "groq-qwen", "provider": "groq", "model": os.environ.get("GROQ_CODE_MODEL", "qwen/qwen3-32b").strip(),
     "name": "Qwen3 32B", "tag": "Groq · для кода"},
    {"id": "gemini", "provider": "gemini", "model": GEMINI_MODEL,
     "name": "Gemini Flash", "tag": "Google · считает кодом"},
]
ALLOW_ORIGIN = os.environ.get("ALLOWED_ORIGIN", "*").strip() or "*"
# Cloudflare перед Groq (и др.) режет стандартный «Python-urllib/3.x» как бота (ошибка 1010) —
# представляемся обычным клиентом
USER_AGENT = os.environ.get("HTTP_USER_AGENT", "Mozilla/5.0 (compatible; LXP-AI-proxy/1.0; +https://lxp-answers.onrender.com)")
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
SITE_TOOLS_HINT = (
    " У тебя есть инструменты. Если вопрос про задание курса — сначала найди его на сайте (search_answers, "
    "потом get_answer) и объясняй тем же методом и в тех же обозначениях, что в решении сайта; "
    "в конце дай ссылку на задание в виде [название](link). "
    "Если пользователь даёт свои данные или вариант — пересчитай заново, не подгоняй под ответ сайта."
)
TOOLS_SYSTEM = CHAT_SYSTEM + SITE_TOOLS_HINT + " Вычисления проверяй выполнением кода."
OPENAI_TOOLS_SYSTEM = CHAT_SYSTEM + SITE_TOOLS_HINT + " Вычисления проверяй вручную, подстановкой."


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


# ---------- ошибки провайдеров ----------
class AIError(RuntimeError):
    def __init__(self, msg, status=0, retry_after=0):
        super().__init__(msg)
        self.status = status
        self.retry_after = retry_after  # через сколько секунд провайдер разрешит следующий запрос (при 429)


GeminiError = AIError


# ---------- Gemini ----------


def gemini_call(body, model=None):
    if not GEMINI_KEY:
        raise GeminiError("LXP AI не подключён: в настройках прокси нет GEMINI_API_KEY")
    req = urllib.request.Request(
        GEMINI_URL.format(model=model or GEMINI_MODEL),
        data=json.dumps(body).encode(),
        method="POST",
        headers={"x-goog-api-key": GEMINI_KEY, "Content-Type": "application/json", "User-Agent": USER_AGENT},
    )
    try:
        with urllib.request.urlopen(req, timeout=150) as r:
            return json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", "ignore")
        retry_after = 0
        try:
            err = json.loads(detail)["error"]
            detail = err["message"]
            for d in err.get("details", []):
                m = re.match(r"(\d+(?:\.\d+)?)s", str(d.get("retryDelay", "")))
                if m:
                    retry_after = round(float(m.group(1)))
        except Exception:  # noqa: BLE001
            pass
        if exc.code == 429:
            raise GeminiError("Бесплатный лимит Gemini на эту минуту закончился", 429, retry_after or 60) from None
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
        req = urllib.request.Request(SITE_URL + "/answers.json", headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(req, timeout=20) as r:
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
            if WEB_TOOL in tools and exc.status == 400:
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


# ---------- Groq и Mistral (OpenAI-совместимый API) ----------
OPENAI_SITE_TOOLS = [{"type": "function", "function": f} for f in SITE_TOOLS["functionDeclarations"]]


def openai_call(p, messages, tools=None, temperature=0.4):
    body = {"model": p["model"], "messages": messages, "temperature": temperature}
    if tools:
        body.update({"tools": tools, "tool_choice": "auto"})
    req = urllib.request.Request(
        p["url"],
        data=json.dumps(body).encode(),
        method="POST",
        headers={"Authorization": f"Bearer {p['key']}", "Content-Type": "application/json", "Accept": "application/json",
                 "User-Agent": USER_AGENT},
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            data = json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", "ignore")
        try:
            err = json.loads(detail)
            detail = (err.get("error") or {}).get("message") if isinstance(err.get("error"), dict) else err.get("message", detail)
        except Exception:  # noqa: BLE001
            pass
        if exc.code == 429:
            try:
                wait = round(float(exc.headers.get("retry-after", "") or 0))
            except ValueError:
                wait = 0
            raise AIError(f"Бесплатный лимит {p['name']} на эту минуту закончился", 429, wait or 60) from None
        raise AIError(f"{p['name']}: HTTP {exc.code} — {str(detail)[:300]}", exc.code) from None
    except (urllib.error.URLError, TimeoutError) as exc:
        raise AIError(f"{p['name']}: нет ответа ({exc})", 503) from None
    # рассуждения «думающих» моделей (<think>…</think>) не трогаем — чат показывает их отдельным блоком
    return (data.get("choices") or [{}])[0].get("message") or {}


def strip_think(text):
    """Без рассуждений <think>…</think> — для правки кода, где нужен только итоговый код."""
    return re.sub(r"<think>[\s\S]*?(</think>|$)", "", text).strip()


def openai_messages(system, messages):
    return [{"role": "system", "content": system}] + [
        {"role": "assistant" if m.get("role") == "assistant" else "user", "content": str(m.get("content", ""))}
        for m in messages[-20:] if isinstance(m, dict)
    ]


def openai_plain(p, system, messages, temperature=0.4):
    text = (openai_call(p, openai_messages(system, messages), temperature=temperature).get("content") or "").strip()
    if not text:
        raise AIError(f"{p['name']} не ответил (пустой ответ)", 502)
    return text


def run_site_tool(name, args, used):
    try:
        if name == "search_answers":
            used.append(f"поиск: {args.get('query', '')}")
            return {"results": search_answers(args.get("query", ""))}
        if name == "get_answer":
            used.append(f"задание: {args.get('id', '')}")
            return get_answer(args.get("id", ""))
        return {"error": "нет такой функции"}
    except Exception as exc:  # noqa: BLE001
        return {"error": f"не удалось получить ответы сайта: {exc}"}


def openai_tools(p, messages):
    """Диалог с поиском по ответам сайта через вызов функций."""
    msgs = openai_messages(OPENAI_TOOLS_SYSTEM, messages)
    used = []
    for _ in range(4):
        try:
            msg = openai_call(p, msgs, tools=OPENAI_SITE_TOOLS)
        except AIError as exc:
            # у Llama иногда ломается вызов функции (400 tool_use_failed) — тогда отвечаем без инструментов
            if exc.status == 400 and not used:
                return openai_plain(p, CHAT_SYSTEM, messages)
            raise
        calls = msg.get("tool_calls") or []
        if not calls:
            text = (msg.get("content") or "").strip()
            if not text:
                raise AIError(f"{p['name']} не ответил (пустой ответ)", 502)
            if used:
                record("tools", True, model=p["name"], detail="; ".join(used))
            return text
        msgs.append({"role": "assistant", "content": msg.get("content") or "", "tool_calls": calls})
        for c in calls:
            fn = c.get("function") or {}
            try:
                args = json.loads(fn.get("arguments") or "{}")
            except ValueError:
                args = {}
            result = run_site_tool(fn.get("name"), args, used)
            msgs.append({"role": "tool", "tool_call_id": c.get("id"), "name": fn.get("name"),
                         "content": json.dumps(result, ensure_ascii=False)[:30000]})
    # функции вызывались слишком много раз — просим итог без инструментов
    return (openai_call(p, msgs).get("content") or "").strip() or openai_plain(p, CHAT_SYSTEM, messages)


# ---------- выбор модели ----------
def models_info():
    return [{"id": m["id"], "name": m["name"], "tag": m["tag"], "model": m["model"], "provider": PROVIDERS[m["provider"]]["name"],
             "on": bool(PROVIDERS[m["provider"]]["key"])} for m in MODELS]


def pick_model(model_id):
    """Выбранная модель; неизвестная или без ключа — понятная ошибка, без молчаливой подмены."""
    on = [m for m in MODELS if PROVIDERS[m["provider"]]["key"]]
    if not on:
        raise AIError("LXP AI не подключён: в настройках прокси нет ключей (GROQ_API_KEY, MISTRAL_API_KEY, GEMINI_API_KEY)")
    m = next((x for x in MODELS if x["id"] == model_id), None) or on[0]
    if not PROVIDERS[m["provider"]]["key"]:
        raise AIError(f"Модель {m['name']} не подключена: в настройках прокси нет {PROVIDERS[m['provider']]['env']}")
    return m


def openai_target(m):
    return {**PROVIDERS[m["provider"]], "model": m["model"], "name": m["name"], "id": m["id"]}


def chat(messages, model_id, web=False):
    """(текст, имя модели). Поиск Google умеет только Gemini."""
    m = pick_model("gemini" if web else model_id)
    if m["provider"] == "gemini":
        return gemini_tools(messages, web=web), m["name"]
    return openai_tools(openai_target(m), messages), m["name"]


def refine(code, lang, instruction, model_id):
    m = pick_model(model_id)
    msgs = [{"role": "user", "content": f"Язык: {lang}.\n\nВот код:\n{code}\n\nЗадача: {instruction}"}]
    if m["provider"] == "gemini":
        return gemini_plain(REFINE_SYSTEM, msgs, temperature=0.2), m["name"]
    return strip_think(openai_plain(openai_target(m), REFINE_SYSTEM, msgs, temperature=0.2)), m["name"]


def check_model(model_id):
    question = [{"role": "user", "content": "Ответь одним коротким предложением: ты на связи?"}]
    m = pick_model(model_id)
    if m["id"] != model_id:
        raise AIError("нет такой модели")
    if m["provider"] == "gemini":
        return gemini_plain(CHAT_SYSTEM, question), m
    return strip_think(openai_plain(openai_target(m), CHAT_SYSTEM, question)), m


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
        "models": models_info(),
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

    def _fail(self, exc):
        # все провайдеры упёрлись в лимит — отдельный ответ, сайт показывает оповещение с отсчётом
        if isinstance(exc, AIError) and exc.status == 429:
            self._json(429, {"error": str(exc), "code": "rate_limit", "retryAfter": exc.retry_after})
        else:
            self._json(502, {"error": str(exc)})

    def _ip(self):
        fwd = self.headers.get("X-Forwarded-For", "")
        return fwd.split(",")[0].strip() if fwd else self.client_address[0]

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_GET(self):
        self._json(200, {"ok": True, "models": [m for m in models_info() if m["on"]]})

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
        model_id = str(body.get("model", ""))
        web = bool(body.get("web"))
        t0 = time.time()
        try:
            text, via = chat(messages, model_id, web)
        except Exception as exc:  # noqa: BLE001
            ms = int((time.time() - t0) * 1000)
            record("chat", False, ms, model_id, str(exc))
            self._fail(exc)
            return
        record("chat", True, int((time.time() - t0) * 1000), via + (" + Google" if web else ""))
        self._json(200, {"text": text, "via": via})

    def _refine(self, body):
        instruction = str(body.get("instruction", "")).strip()
        if not instruction:
            self._json(400, {"error": "empty instruction"})
            return
        t0 = time.time()
        try:
            text, via = refine(str(body.get("code", "")), str(body.get("lang", "text")), instruction,
                               str(body.get("model", "")))
        except Exception as exc:  # noqa: BLE001
            record("refine", False, int((time.time() - t0) * 1000), "refine", str(exc))
            self._fail(exc)
            return
        record("refine", True, int((time.time() - t0) * 1000), f"{via} · правка кода")
        self._json(200, {"text": text, "via": via})

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
            model_id = str(body.get("model", ""))
            t0 = time.time()
            try:
                answer, m = check_model(model_id)
                ok, why = True, f"{m['name']} ({m['model']}) отвечает"
            except Exception as exc:  # noqa: BLE001
                answer, ok, why = "", False, str(exc)
            ms = int((time.time() - t0) * 1000)
            record("check", ok, ms, model_id, "" if ok else why)
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
    on = [m["name"] for m in models_info() if m["on"]]
    print(f"LXP AI proxy on :{port}; providers: {on or 'нет ключей'}; origin: {ALLOW_ORIGIN}")
    srv.serve_forever()


if __name__ == "__main__":
    main()
