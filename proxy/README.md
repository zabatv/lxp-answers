# DeepSeek proxy (opendeep)

Мини-сервер, повторяющий AI-механику collablab: принимает запрос от сайта и
обращается к DeepSeek через библиотеку `opendeep` (веб-API chat.deepseek.com +
proof-of-work). Токен хранится в переменной окружения и в браузер не попадает.

## Эндпоинты
- `GET /` — проверка (`{"ok":true,"tokenSet":...}`)
- `POST /api/refine` — тело `{code, lang, instruction, model}` → ответ `{text}`

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
