# DeepSeek proxy (opendeep)

Мини-сервер, повторяющий AI-механику collablab: принимает запрос от сайта и
обращается к DeepSeek через библиотеку `opendeep` (веб-API chat.deepseek.com +
proof-of-work). Токен хранится в переменной окружения и в браузер не попадает.

## Эндпоинты
- `GET /` — проверка (`{"ok":true,"tokenSet":...}`)
- `POST /api/refine` — тело `{code, lang, instruction, model}` → ответ `{text}`
- `POST /api/chat` — тело `{messages:[{role,content}], model}` → ответ `{text}`
- `POST /api/admin/{status|check|token|clear}` — админка сайта (`#/admin`), тело `{password, …}`

## Запасные модели (бесплатные, без карты)
Задай ключ хотя бы одного провайдера — он появится в выборе модели в чате и будет
отвечать вместо DeepSeek, если тот откажет (токен устарел и т. п.). `AI_FALLBACK=0` выключает подмену.

| Переменная | Где взять ключ | Модель по умолчанию (`*_MODEL` — заменить) |
| --- | --- | --- |
| `GEMINI_API_KEY` | aistudio.google.com → Get API key | `gemini-2.5-flash` |
| `GROQ_API_KEY` | console.groq.com → API Keys | `llama-3.3-70b-versatile` |
| `OPENROUTER_API_KEY` | openrouter.ai → Keys | `meta-llama/llama-3.3-70b-instruct:free` |

## Админка
- `ADMIN_PASSWORD` — пароль админки. Без этой переменной админка выключена. В коде пароля нет.
- `RENDER_API_KEY` — необязательно. Если задан, новый токен из админки записывается в
  `DEEPSEEK_API_KEY` сервиса и переживает перезапуск; иначе действует до перезапуска.
  Ключ даёт доступ ко всему аккаунту Render — добавляй, только если это устраивает.
- После 5 неверных паролей за 10 минут вход в админку с этого адреса блокируется на 10 минут.

## Деплой на Render (Web Service)
1. Render → **New → Web Service** → тот же репозиторий `lxp-answers`.
2. **Root Directory:** `proxy`
3. **Runtime:** Python 3
4. **Build Command:** `pip install -r requirements.txt`
5. **Start Command:** `python app.py`
6. **Environment:**
   - `DEEPSEEK_API_KEY` = твой userToken из localStorage `chat.deepseek.com`
   - (необязательно) `ALLOWED_ORIGIN` = URL сайта, напр. `https://lxp-answers.onrender.com`
     (по умолчанию `*` — разрешены все источники).
7. **Create Web Service.** Получишь адрес вида `https://lxp-proxy.onrender.com`.

## Привязать сайт к прокси
На статическом сайте → **Environment** добавь
`VITE_DEEPSEEK_PROXY = https://<адрес-прокси>.onrender.com`,
затем **Manual Deploy → Clear build cache & deploy**.

## Где взять токен
chat.deepseek.com → войти → DevTools → Application → Local Storage →
значение `userToken` (без него opendeep может работать в ограниченном режиме).
