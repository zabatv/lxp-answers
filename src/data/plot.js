// Мини-«плоттер» для HTML-файлов с графиками (чистый SVG, без библиотек).
// plotPage(заголовок, код) собирает готовую страницу; в коде доступны
// plot(название, [xmin, xmax], [ymin, ymax], (c) => { … }, легенда), цвета BLUE / ORANGE / GRAY / GREEN.
// Внутри draw: c.fn(f, a, b, цвет, пунктир) — график функции, c.line(точки, цвет, пунктир) — ломаная,
// c.seg(a, b, f, цвет, левый, правый) — кусок с кружками на концах (true — закрашен, false — выколот,
// null — без кружка), c.dot(x, y, цвет, выколота), c.text(x, y, подпись).

const lib = `    const NS = 'http://www.w3.org/2000/svg'
    const W = 340, H = 260, P = 34
    const BLUE = '#1f77b4', ORANGE = '#e8590c', GRAY = '#9a9a9a', GREEN = '#2f9e44'
    const floor = Math.floor

    function el(name, attrs, parent) {
      const e = document.createElementNS(NS, name)
      for (const k in attrs) e.setAttribute(k, attrs[k])
      if (parent) parent.appendChild(e)
      return e
    }

    // «круглый» шаг сетки: 1, 2, 5, 10, 20, 50…
    function niceStep(range) {
      const raw = range / 10
      const p = Math.pow(10, Math.floor(Math.log10(raw)))
      for (const m of [1, 2, 5]) if (m * p >= raw) return m * p
      return 10 * p
    }

    const label = (v) => (Math.abs(v) >= 10000 ? +(v / 1000).toFixed(1) + 'k' : String(+v.toFixed(2)))

    let uid = 0
    function plot(title, xr, yr, draw, legend) {
      const fig = document.createElement('figure')
      const cap = document.createElement('figcaption')
      cap.textContent = title
      fig.appendChild(cap)
      const svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H }, fig)
      const sx = (x) => P + ((x - xr[0]) / (xr[1] - xr[0])) * (W - 2 * P)
      const sy = (y) => H - P - ((y - yr[0]) / (yr[1] - yr[0])) * (H - 2 * P)
      const ax = Math.min(Math.max(0, yr[0]), yr[1]) // уровень оси x
      const ay = Math.min(Math.max(0, xr[0]), xr[1]) // положение оси y
      const xs = niceStep(xr[1] - xr[0]), ys = niceStep(yr[1] - yr[0])
      for (let x = Math.ceil(xr[0] / xs) * xs; x <= xr[1] + 1e-9; x += xs) {
        el('line', { x1: sx(x), y1: sy(yr[0]), x2: sx(x), y2: sy(yr[1]), stroke: '#eee' }, svg)
        if (Math.abs(x - ay) > 1e-9) el('text', { x: sx(x), y: sy(ax) + 13, 'font-size': 10, 'text-anchor': 'middle', fill: '#555' }, svg).textContent = label(x)
      }
      for (let y = Math.ceil(yr[0] / ys) * ys; y <= yr[1] + 1e-9; y += ys) {
        el('line', { x1: sx(xr[0]), y1: sy(y), x2: sx(xr[1]), y2: sy(y), stroke: '#eee' }, svg)
        if (Math.abs(y - ax) > 1e-9) el('text', { x: sx(ay) - 4, y: sy(y) + 3, 'font-size': 10, 'text-anchor': 'end', fill: '#555' }, svg).textContent = label(y)
      }
      el('line', { x1: sx(xr[0]), y1: sy(ax), x2: sx(xr[1]), y2: sy(ax), stroke: '#333' }, svg)
      el('line', { x1: sx(ay), y1: sy(yr[0]), x2: sx(ay), y2: sy(yr[1]), stroke: '#333' }, svg)
      const id = 'clip' + uid++
      el('rect', { x: P, y: P, width: W - 2 * P, height: H - 2 * P }, el('clipPath', { id: id }, svg))
      const g = el('g', { 'clip-path': 'url(#' + id + ')' }, svg)
      const path = (pts, color, dash, width) => {
        if (pts.length < 2) return
        const d = pts.map((p, i) => (i ? 'L' : 'M') + sx(p[0]).toFixed(1) + ' ' + sy(p[1]).toFixed(1)).join(' ')
        el('path', { d: d, fill: 'none', stroke: color, 'stroke-width': width || 2, 'stroke-dasharray': dash ? '5 4' : 'none', 'stroke-linecap': 'round' }, g)
      }
      const dot = (x, y, color, open) => el('circle', { cx: sx(x), cy: sy(y), r: 3.2, fill: open ? '#fff' : color, stroke: color, 'stroke-width': 1.5 }, svg)
      draw({
        line: path,
        fn: (f, a, b, color, dash) => {
          // разрывы (скачки и деление на 0) не соединяем линией
          let pts = []
          const flush = () => { path(pts, color, dash); pts = [] }
          for (let i = 0; i <= 600; i++) {
            const x = a + ((b - a) * i) / 600, y = f(x)
            if (!isFinite(y) || Math.abs(y) > 1e6) { flush(); continue }
            const last = pts[pts.length - 1]
            if (last && Math.abs(y - last[1]) > (yr[1] - yr[0])) flush()
            pts.push([x, y])
          }
          flush()
        },
        seg: (a, b, f, color, lc, rc, width) => {
          const pts = []
          for (let i = 0; i <= 40; i++) { const x = a + ((b - a) * i) / 40; pts.push([x, f(x)]) }
          path(pts, color, false, width)
          if (lc !== null) dot(a, f(a), color, !lc)
          if (rc !== null) dot(b, f(b), color, !rc)
        },
        dot: dot,
        text: (x, y, s) => { el('text', { x: sx(x) + 5, y: sy(y) - 6, 'font-size': 11, fill: '#000' }, svg).textContent = s },
      })
      if (legend) {
        const lg = document.createElement('div')
        lg.className = 'legend'
        lg.innerHTML = legend.map((l) => '<span><i style="background:' + l[1] + '"></i>' + l[0] + '</span>').join('')
        fig.appendChild(lg)
      }
      document.getElementById('out').appendChild(fig)
    }
`

export const plotPage = (heading, script) => `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Графики</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 16px; color: #1a1a1a; background: #fff; }
    h1 { font-size: 20px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; }
    figure { margin: 0; border: 1px solid #ddd; border-radius: 10px; padding: 10px; }
    figcaption { font-size: 14px; font-weight: 600; margin-bottom: 4px; }
    .legend { font-size: 13px; margin-top: 4px; }
    .legend span { margin-right: 12px; white-space: nowrap; }
    .legend i { display: inline-block; width: 14px; height: 3px; vertical-align: middle; margin-right: 4px; }
    svg { width: 100%; height: auto; display: block; }
  </style>
</head>
<body>
  <h1>${heading}</h1>
  <div class="grid" id="out"></div>
  <script>
${lib}
${script}
  </script>
</body>
</html>`
