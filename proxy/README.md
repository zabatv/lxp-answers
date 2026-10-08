# Прокси LXP AI (Gemini)

Мини-сервер между сайтом и Gemini API (Google AI Studio). Ключ хранится только здесь,
в переменной окружения, и в браузер не попадает. Зависимостей нет — только стандартная библиотека Python.

## Эндпоинты
- `GET /` — проверка (`{"ok":true,"geminiSet":…,"model":…}`)
- `POST /api/chat` — тело `{messages:[{role,content}], model, web}` → `{text}`
  - `model: "tools"` (по умолчанию) — с инструментами: поиск по ответам сайта, проверка вычислений кодом;
  - `model: "fast"` — просто ответ, без инструментов;
  - `web: true` — ещё и поиск Google (на бесплатном ключе может упираться в лимит — тогда ответ без него).
- `POST /api/refine` — тело `{code, lang, instruction}` → `{text}` (правка кода у файла)
- `POST /api/admin/{status|check|clear}` — админка сайта (`#/admin`), тело `{password}`

## Деплой на Render (Web Service)
1. Render → **New → Web Service** → репозиторий `lxp-answers`.
2. **Root Directory:** `proxy`, **Runtime:** Python 3
3. **Build Command:** `pip install -r requirements.txt`, **Start Command:** `python app.py`
4. **Environment:**
   - `GEMINI_API_KEY` — ключ с aistudio.google.com → Get API key (бесплатно, без карты);
   - `ADMIN_PASSWORD` — пароль админки (без него админка выключена; в коде пароля нет);
   - необязательно: `GEMINI_MODEL` (по умолчанию `gemini-3.5-flash`),
     `ALLOWED_ORIGIN` (адрес сайта, по умолчанию `*`), `SITE_URL` (откуда брать `answers.json`,
     по умолчанию `https://lxp-answers.onrender.com`).

## Привязать сайт к прокси
На статическом сайте → **Environment**: `VITE_DEEPSEEK_PROXY = https://<адрес-прокси>.onrender.com`
(имя переменной осталось от прежней версии), затем **Manual Deploy → Clear build cache & deploy**.

## Поиск по ответам сайта
При сборке сайт выкладывает `answers.json` (скрипт `scripts/export-answers.mjs`). Прокси берёт его
с `SITE_URL`, кэширует на 10 минут и отдаёт Gemini через функции `search_answers` и `get_answer`.

## Админка
После 5 неверных паролей за 10 минут вход с этого адреса блокируется на 10 минут.
Статистика и журнал хранятся в памяти и обнуляются при перезапуске сервера.
