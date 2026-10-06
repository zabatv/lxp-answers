# LXP — Ответы по дисциплинам

React + Vite сайт с готовыми ответами по дисциплинам (ReactBits-компоненты).
Вкладки заведены под все 14 дисциплин; заполнена «XML технологии», остальные — заглушки «в разработке».

## Локально

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # сборка в ./dist
npm run preview  # предпросмотр сборки
```

## Деплой на Render (Static Site)

1. Запушить этот репозиторий на GitHub.
2. На https://render.com → **New** → **Static Site** → подключить репозиторий.
3. Настройки (Render подхватит их из `render.yaml` автоматически):
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`
4. **Create Static Site** — через пару минут сайт будет доступен по адресу `*.onrender.com`.

## Как добавить ответы по другой дисциплине

Открыть `src/data/disciplines.js`, у нужной дисциплины сменить `status: 'soon'`
на `status: 'ready'` и добавить `answers: [ ... ]` в том же формате, что у `xml`.

## Структура

```
src/
  App.jsx                     вкладки + рендер ответов
  data/disciplines.js         список дисциплин и ответы
  components/
    CodeBlock.jsx             блок кода с копированием
    reactbits/                компоненты ReactBits
      Squares.jsx             анимированный фон
      GradientText.jsx
      ShinyText.jsx
      SpotlightCard.jsx
```
