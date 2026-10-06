// Ответы по дисциплине «Основы HTML/CSS».
const R = String.raw

export const htmlcssAnswers = [
  {
    id: 'hc_pr1',
    title: 'Практическая работа 1 — пути между файлами',
    points: 10,
    note: 'Задание на твоих 10 файлах (структура папок у меня). Ниже — принцип и пример; подставь имена своих файлов/папок.',
    task: 'Связать html-файлы и изображения относительными путями: ссылки с главной на товары, шапка на главную и категории, пути к страницам и изображениям товаров.',
    files: [
      {
        name: 'пути.txt',
        lang: 'text',
        code: R`Относительные пути (от текущего файла):
  ./file.html      — рядом (та же папка)
  ../file.html     — на уровень выше
  ../../file.html  — на два уровня выше
  images/pic.jpg   — в подпапке images

Пример структуры:
  index.html
  images/logo.png
  catalog/coffee/index.html
  catalog/coffee/espresso.html
  catalog/coffee/img/espresso.jpg`,
      },
      {
        name: 'фрагменты.html',
        lang: 'html',
        code: R`<!-- index.html: ссылка на товар и его картинка -->
<a href="catalog/coffee/espresso.html">Espresso</a>
<img src="catalog/coffee/img/espresso.jpg" alt="Espresso">

<!-- espresso.html: шапка на главную и категорию -->
<a href="../../index.html">Главная</a>
<a href="index.html">Кофе</a>
<!-- картинка товара со страницы товара -->
<img src="img/espresso.jpg" alt="Espresso">
<!-- логотип со страницы товара (он в корне images) -->
<img src="../../images/logo.png" alt="logo">`,
      },
    ],
  },

  {
    id: 'hc_tables',
    title: 'Таблицы и списки — напитки',
    points: null,
    task: 'По аналогии с Espresso добавить в таблицу latte, americano, ice coffee, mocha.',
    files: [
      {
        name: 'table.html',
        lang: 'html',
        code: R`<table border="1" cellpadding="6">
  <tr>
    <th>Напиток</th><th>Сорт</th><th>Крепость</th><th>Цена</th>
  </tr>
  <tr><td>Espresso</td><td>Arabica</td><td>Сильная</td><td>120 ₽</td></tr>
  <tr><td>Latte</td><td>Arabica</td><td>Средняя</td><td>180 ₽</td></tr>
  <tr><td>Americano</td><td>Robusta</td><td>Средняя</td><td>140 ₽</td></tr>
  <tr><td>Ice Coffee</td><td>Arabica</td><td>Лёгкая</td><td>200 ₽</td></tr>
  <tr><td>Mocha</td><td>Blend</td><td>Средняя</td><td>220 ₽</td></tr>
  <tr><td>Cappuccino</td><td>Arabica</td><td>Средняя</td><td>190 ₽</td></tr>
</table>`,
      },
    ],
  },

  {
    id: 'hc_pr2',
    title: 'Практическая работа 2 — форма напитка',
    points: 10,
    task: 'Форма с полями name: title, sort, strong, image, cost, description + пустая таблица #table и подключённый скрипт, который наполняет таблицу.',
    files: [
      {
        name: 'index.html',
        lang: 'html',
        code: R`<body>
  <form>
    <input type="text" name="title" placeholder="Название напитка">
    <input type="text" name="sort" placeholder="Сорт кофе">
    <input type="text" name="strong" placeholder="Крепость обжарки">
    <input type="url" name="image" placeholder="Ссылка на изображение">
    <input type="number" name="cost" placeholder="Стоимость">
    <textarea name="description" placeholder="Описание"></textarea>
    <button type="submit">Добавить</button>
  </form>
  <br>
  <table id="table">
    <tr>
      <th>Название</th><th>Сорт</th><th>Крепость</th>
      <th>Изображение</th><th>Стоимость</th><th>Описание</th>
    </tr>
  </table>
  <script data-src="https://queen-leksa.github.io/111/script.js"></script>
</body>`,
      },
    ],
  },

  {
    id: 'hc_pr3',
    title: 'Практическая работа 3 — Metro-плитки (Windows 8)',
    points: 10,
    task: 'Схематично сверстать плиточное меню Windows 8 (разные размеры блоков, горизонтальный скролл). Пример: lekso4ka.github.io/fun_w8/win8.html',
    files: [
      {
        name: 'metro.html',
        lang: 'html',
        code: R`<!doctype html>
<html lang="ru">
<head><meta charset="utf-8"><link rel="stylesheet" href="style.css"></head>
<body>
  <div class="start">
    <div class="group">
      <div class="tile wide green">Почта</div>
      <div class="tile blue">Календарь</div>
      <div class="tile orange">Погода</div>
      <div class="tile big purple">Фото</div>
      <div class="tile red">Люди</div>
      <div class="tile wide teal">Магазин</div>
    </div>
    <div class="group">
      <div class="tile big blue">Игры</div>
      <div class="tile green">Музыка</div>
      <div class="tile orange">Видео</div>
      <div class="tile red">Карты</div>
    </div>
  </div>
</body>
</html>`,
      },
      {
        name: 'style.css',
        lang: 'css',
        code: R`* { box-sizing: border-box; margin: 0; }
body { background: #1b1b2f; padding: 30px; }
.start {
  display: flex;
  gap: 40px;
  overflow-x: auto;          /* горизонтальный скролл */
  height: 100vh;
}
.group {
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  gap: 8px;
  width: 260px;
  flex: none;
}
.tile {
  width: 120px; height: 120px;
  display: flex; align-items: flex-end;
  padding: 10px; color: #fff; font: 14px sans-serif;
  cursor: pointer; transition: transform .15s;
}
.tile:hover { transform: scale(1.05); }
.tile.wide { width: 248px; }
.tile.big  { width: 248px; height: 248px; }
.green{background:#2ecc71}.blue{background:#3498db}.orange{background:#e67e22}
.purple{background:#9b59b6}.red{background:#e74c3c}.teal{background:#1abc9c}`,
      },
    ],
  },

  {
    id: 'hc_pr4',
    title: 'Практическая работа 4 — вёрстка по макету + адаптив',
    points: 10,
    note: 'Макета у меня нет — ниже адаптивный каркас. Подгони под свой макет и выложи на GitHub Pages (Settings → Pages → ветка main).',
    task: 'Сверстать проект по макету с мобильной адаптацией, выложить на GitHub Pages, прислать ссылки на репозиторий и результат.',
    files: [
      {
        name: 'index.html',
        lang: 'html',
        code: R`<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <header class="header">
    <div class="logo">Logo</div>
    <nav class="nav"><a href="#">Главная</a><a href="#">О нас</a><a href="#">Контакты</a></nav>
  </header>
  <main class="hero">
    <h1>Заголовок проекта</h1>
    <p>Короткое описание под макет.</p>
  </main>
</body>
</html>`,
      },
      {
        name: 'style.css',
        lang: 'css',
        code: R`* { box-sizing: border-box; margin: 0; }
body { font-family: sans-serif; }
.header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px 24px; background: #222; color: #fff;
}
.nav a { color: #fff; margin-left: 16px; text-decoration: none; }
.hero { padding: 60px 24px; text-align: center; }

/* мобильная адаптация */
@media (max-width: 600px) {
  .header { flex-direction: column; gap: 10px; }
  .nav a { margin: 0 8px; }
  .hero { padding: 36px 16px; }
}`,
      },
    ],
  },

  {
    id: 'hc_pr5',
    title: 'Практическая работа 5 — CSS-машинка с анимацией',
    points: 10,
    task: 'Минимумом HTML и средствами CSS нарисовать «машинку» шириной 200px; при загрузке она выезжает слева и останавливается за 50px до правого края.',
    files: [
      {
        name: 'car.html',
        lang: 'html',
        code: R`<!doctype html>
<html lang="ru">
<head><meta charset="utf-8"><link rel="stylesheet" href="style.css"></head>
<body>
  <div class="road">
    <div class="car">
      <div class="body"></div>
      <div class="cabin"></div>
      <div class="wheel left"></div>
      <div class="wheel right"></div>
    </div>
  </div>
</body>
</html>`,
      },
      {
        name: 'style.css',
        lang: 'css',
        code: R`* { margin: 0; box-sizing: border-box; }
.road { position: relative; height: 100vh; background: linear-gradient(#87ceeb 70%, #555 70%); overflow: hidden; }
.car {
  position: absolute; bottom: 40px; left: 0; width: 200px; height: 60px;
  animation: drive 3s ease-out forwards;
}
@keyframes drive {
  from { transform: translateX(-220px); }
  to   { transform: translateX(calc(100vw - 250px)); } /* 200px машина + 50px отступ */
}
.body  { position: absolute; bottom: 0; width: 200px; height: 36px; background: #e74c3c; border-radius: 8px; }
.cabin { position: absolute; bottom: 30px; left: 50px; width: 90px; height: 30px; background: #c0392b; border-radius: 10px 10px 0 0; }
.wheel { position: absolute; bottom: -10px; width: 36px; height: 36px; background: #222; border-radius: 50%; border: 6px solid #777; }
.wheel.left  { left: 24px; }
.wheel.right { right: 24px; }`,
      },
    ],
  },

  {
    id: 'hc_pr6',
    title: 'Практическая работа 6 — вёрстка на CSS Grid',
    points: 10,
    note: 'Макета у меня нет — ниже типовой grid-каркас (шапка/сайдбар/контент/подвал). Подгони под свой макет.',
    task: 'Создать веб-страницу по макету, используя CSS Grid. Цвета и картинки любые.',
    files: [
      {
        name: 'grid.html',
        lang: 'html',
        code: R`<!doctype html>
<html lang="ru">
<head><meta charset="utf-8"><link rel="stylesheet" href="style.css"></head>
<body>
  <div class="layout">
    <header class="hd">Шапка</header>
    <aside class="sb">Меню</aside>
    <main class="mn">Контент</main>
    <footer class="ft">Подвал</footer>
  </div>
</body>
</html>`,
      },
      {
        name: 'style.css',
        lang: 'css',
        code: R`* { box-sizing: border-box; margin: 0; }
.layout {
  display: grid;
  grid-template-columns: 220px 1fr;
  grid-template-rows: 60px 1fr 50px;
  grid-template-areas:
    "hd hd"
    "sb mn"
    "ft ft";
  min-height: 100vh;
  gap: 8px;
}
.hd { grid-area: hd; background: #34495e; color: #fff; display: grid; place-items: center; }
.sb { grid-area: sb; background: #ecf0f1; padding: 16px; }
.mn { grid-area: mn; background: #fff; padding: 16px; }
.ft { grid-area: ft; background: #34495e; color: #fff; display: grid; place-items: center; }

@media (max-width: 600px) {
  .layout { grid-template-columns: 1fr; grid-template-areas: "hd" "sb" "mn" "ft"; }
}`,
      },
    ],
  },

  {
    id: 'hc_final',
    title: 'Итоговая КТ — лендинг (5 экранов)',
    points: null,
    task: 'Одностраничный сайт (landing page) минимум из 5 экранов прокрутки на любую тему.',
    files: [
      {
        name: 'index.html',
        lang: 'html',
        code: R`<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Лендинг</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <header class="nav"><b>Brand</b>
    <nav><a href="#hero">Главная</a><a href="#about">О нас</a><a href="#feat">Услуги</a>
    <a href="#cards">Товары</a><a href="#contact">Контакты</a></nav>
  </header>

  <section id="hero" class="screen hero">
    <h1>Большой заголовок</h1><p>Подзаголовок и призыв к действию.</p>
    <button>Начать</button>
  </section>

  <section id="about" class="screen">
    <h2>О нас</h2><p>Текст о проекте.</p>
  </section>

  <section id="feat" class="screen grey">
    <h2>Услуги</h2>
    <div class="row"><div class="box">Раз</div><div class="box">Два</div><div class="box">Три</div></div>
  </section>

  <section id="cards" class="screen">
    <h2>Товары</h2>
    <div class="row">
      <div class="card">Карточка 1</div><div class="card">Карточка 2</div><div class="card">Карточка 3</div>
    </div>
  </section>

  <section id="contact" class="screen grey">
    <h2>Контакты</h2>
    <form><input placeholder="Имя"><input placeholder="E-mail"><button>Отправить</button></form>
  </section>

  <footer class="ft">© 2026</footer>
</body>
</html>`,
      },
      {
        name: 'style.css',
        lang: 'css',
        code: R`* { box-sizing: border-box; margin: 0; }
body { font-family: sans-serif; scroll-behavior: smooth; }
html { scroll-behavior: smooth; }
.nav {
  position: sticky; top: 0; display: flex; justify-content: space-between;
  align-items: center; padding: 14px 24px; background: #111; color: #fff; z-index: 10;
}
.nav a { color: #fff; margin-left: 14px; text-decoration: none; }
.screen {
  min-height: 100vh; display: flex; flex-direction: column;
  justify-content: center; align-items: center; gap: 16px; padding: 40px 24px; text-align: center;
}
.hero { background: linear-gradient(135deg, #7c7bff, #40ffaa); color: #fff; }
.grey { background: #f4f4f8; }
.row { display: flex; gap: 20px; flex-wrap: wrap; justify-content: center; }
.box, .card {
  width: 200px; padding: 30px; border-radius: 12px; background: #fff;
  box-shadow: 0 6px 20px rgba(0,0,0,.1);
}
button { padding: 12px 22px; border: 0; border-radius: 8px; background: #7c7bff; color: #fff; cursor: pointer; }
form { display: flex; flex-direction: column; gap: 10px; width: 280px; }
input { padding: 10px; border: 1px solid #ccc; border-radius: 8px; }
.ft { background: #111; color: #fff; text-align: center; padding: 20px; }`,
      },
    ],
  },
]
