# Прокси LXP AI (Groq · Mistral · Gemini)

Мини-сервер между сайтом и моделями. Ключи хранятся только здесь, в переменных окружения,
и в браузер не попадают. Зависимостей нет — только стандартная библиотека Python.

## Модели — пользователь выбирает сам, под задачу
Сайт показывает только модели, для которых задан ключ провайдера. Модель никто не подменяет молча:
если выбранная упёрлась в лимит, сайт показывает отсчёт и предлагает выбрать другую.

| id | Модель | Провайдер / ключ | Для чего |
| --- | --- | --- | --- |
| `groq` | Llama 3.3 70B (`GROQ_MODEL`) | Groq · `GROQ_API_KEY` | основная: быстрая, большой бесплатный лимит |
| `groq-fast` | Llama 3.1 8B (`GROQ_FAST_MODEL`) | Groq · `GROQ_API_KEY` | мгновенная, для простых вопросов |
| `mistral` | Mistral Small (`MISTRAL_MODEL`) | Mistral · `MISTRAL_API_KEY` | хорошо пишет по-русски |
| `codestral` | Codestral (`CODESTRAL_MODEL`) | Mistral · `MISTRAL_API_KEY` | код (у Mistral бесплатного доступа может не быть) |
| `groq-qwen` | Qwen3 32B (`GROQ_CODE_MODEL`) | Groq · `GROQ_API_KEY` | код, тот же ключ Groq |
| `cerebras-coder` | Qwen3 Coder (`CEREBRAS_MODEL`) | Cerebras · `CEREBRAS_API_KEY` | код, большая модель для программирования |
| `gemini` | Gemini Flash (`GEMINI_MODEL`) | Google · `GEMINI_API_KEY` | проверяет вычисления кодом, ищет в Google |

Ключи: console.groq.com → API Keys; cloud.cerebras.ai → API Keys; console.mistral.ai → API Keys; aistudio.google.com → Get API key.
Все модели умеют искать по ответам сайта (функции `search_answers`, `get_answer`).

## Эндпоинты
- `GET /` — проверка и список подключённых моделей (`{"ok":true,"models":[…]}`)
- `POST /api/chat` — тело `{messages:[{role,content}], model, web}` → `{text, via}`; `web: true` — через Gemini с поиском Google
- `POST /api/refine` — тело `{code, lang, instruction, model}` → `{text, via}` (правка кода у файла)
- `POST /api/admin/{status|check|clear}` — админка сайта (`#/admin`), тело `{password, model?}`
- лимит модели → `429 {code: "rate_limit", retryAfter}`

## Деплой на Render (Web Service)
1. Render → **New → Web Service** → репозиторий `lxp-answers`.
2. **Root Directory:** `proxy`, **Runtime:** Python 3
3. **Build Command:** `pip install -r requirements.txt`, **Start Command:** `python app.py`
4. **Environment:** ключи из таблицы выше (хотя бы один), `ADMIN_PASSWORD` — пароль админки
   (без него админка выключена; в коде пароля нет); необязательно `ALLOWED_ORIGIN`, `SITE_URL`.

## Привязать сайт к прокси
На статическом сайте → **Environment**: `VITE_DEEPSEEK_PROXY = https://<адрес-прокси>.onrender.com`
(имя переменной осталось от прежней версии), затем **Manual Deploy → Clear build cache & deploy**.

## Поиск по ответам сайта
При сборке сайт выкладывает `answers.json` (скрипт `scripts/export-answers.mjs`). Прокси берёт его
с `SITE_URL`, кэширует на 10 минут и отдаёт Gemini через функции `search_answers` и `get_answer`.

## Админка
После 5 неверных паролей за 10 минут вход с этого адреса блокируется на 10 минут.
Статистика и журнал хранятся в памяти и обнуляются при перезапуске сервера.
