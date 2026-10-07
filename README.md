# LXP — Ответы по дисциплинам

React + Vite сайт с готовыми ответами по дисциплинам (ReactBits-компоненты).
Заведены все 14 дисциплин; заполнены «XML технологии», «ООП на C#» и «Основы HTML/CSS»,
остальные — заглушки «в разработке».

Поиск по заданиям — `/` или `Ctrl+K`. У каждого задания своя ссылка вида `#/oop/oop12`.

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
  App.jsx                     каркас: фон, боковая панель, урок, ссылки и горячие клавиши
  index.css                   оформление (цвета — переменные в :root)
  data/                       дисциплины и ответы (disciplines.js, oop.js, htmlcss.js)
  lib/
    lessons.js                плоский список уроков, поиск, подписи меню, ссылки
    highlight.js              подсветка синтаксиса (highlight.js)
    deepseek.js               клиент прокси DeepSeek
  components/
    Sidebar.jsx               логотип, поиск, дерево дисциплин, прогресс
    LessonView.jsx            страница задания: условие, пометка, файлы, «Назад/Далее»
    SoonView.jsx              заглушка «в разработке»
    CodeBlock.jsx             блок кода: подсветка, копирование, правка через DeepSeek
    reactbits/                компоненты ReactBits
      Antigravity.jsx         фон из частиц (three.js, грузится отдельно)
      BranchedMenu.jsx        дерево дисциплин и заданий
      ThoughtLine.jsx         «DeepSeek думает…»
      LatticeLoader.jsx       анимация на заглушке
      GradientText.jsx, ShinyText.jsx, SpotlightCard.jsx
```
