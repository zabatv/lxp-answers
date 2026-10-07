// Диаграммы переходов конечных автоматов для HTML-файлов (чистый SVG, без библиотек).
// fsaPage(заголовок, код) собирает страницу; в коде доступна функция
// fsa(название, { states: [[id, подпись, x, y]], start, accept: [...], alpha: ['0', '1'],
//   t: { id: [след. по alpha[0], по alpha[1], …] }, loops: { id: 'up'|'down'|'left'|'right' },
//   bend: { 'a>b': изгиб }, hide: [скрытые состояния], any: подпись «любой символ», r: радиус, note: пояснение, wide: на всю ширину })
// x, y — координаты в клетках сетки (можно дробные).

const lib = `    const NS = 'http://www.w3.org/2000/svg'
    const COLOR = '#1f77b4'

    function el(name, attrs, parent) {
      const e = document.createElementNS(NS, name)
      for (const k in attrs) e.setAttribute(k, attrs[k])
      if (parent) parent.appendChild(e)
      return e
    }

    let uid = 0
    function fsa(title, spec) {
      const R = spec.r || 20, S = 100
      const pos = {}
      let maxX = 0, maxY = 0
      for (const st of spec.states) { maxX = Math.max(maxX, st[2]); maxY = Math.max(maxY, st[3]) }
      for (const st of spec.states) pos[st[0]] = [64 + st[2] * S, 70 + st[3] * S]
      const W = 64 + maxX * S + 70, H = 70 + maxY * S + 70
      const fig = document.createElement('figure')
      if (spec.wide || W > 430) fig.className = 'wide'
      const cap = document.createElement('figcaption')
      cap.textContent = title
      fig.appendChild(cap)
      const svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, style: 'max-width:' + W * 1.25 + 'px' }, fig)
      const mid = 'arrow' + uid++
      const marker = el('marker', { id: mid, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto' }, el('defs', {}, svg))
      el('path', { d: 'M0,0 L10,5 L0,10 z', fill: COLOR }, marker)
      const line = (d) => el('path', { d: d, fill: 'none', stroke: COLOR, 'stroke-width': 1.5, 'marker-end': 'url(#' + mid + ')' }, svg)
      const label = (x, y, s) => el('text', { x: x, y: y + 4, 'font-size': 13, 'text-anchor': 'middle', fill: '#111' }, svg).textContent = s
      // склеиваем параллельные переходы: «0, 1»
      const hide = spec.hide || []
      const edges = {}
      for (const st of spec.states) {
        const s = st[0]
        if (hide.includes(s) || !spec.t[s]) continue
        spec.t[s].forEach((to, i) => {
          if (hide.includes(to)) return
          const k = s + '>' + to
          ;(edges[k] = edges[k] || []).push(spec.alpha[i])
        })
      }
      for (const k in edges) {
        const [a, b] = k.split('>')
        const text = spec.any && edges[k].length === spec.alpha.length ? spec.any : edges[k].join(', ')
        const [x1, y1] = pos[a]
        if (a === b) {
          const dir = (spec.loops && spec.loops[a]) || 'up'
          const th = { up: -Math.PI / 2, down: Math.PI / 2, left: Math.PI, right: 0 }[dir]
          const pt = (ang, rad) => [x1 + rad * Math.cos(ang), y1 + rad * Math.sin(ang)]
          const p1 = pt(th - 0.45, R), p2 = pt(th + 0.45, R + 1)
          const c1 = pt(th - 0.6, R + 40), c2 = pt(th + 0.6, R + 40)
          line('M' + p1 + ' C' + c1 + ' ' + c2 + ' ' + p2)
          const lp = pt(th, R + 36)
          label(lp[0], lp[1], text)
          continue
        }
        const [x2, y2] = pos[b]
        const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy)
        const nx = -dy / len, ny = dx / len
        const custom = spec.bend && spec.bend[k]
        const bend = custom !== undefined ? custom : edges[b + '>' + a] ? 0.16 : 0
        const cx = (x1 + x2) / 2 + nx * bend * len, cy = (y1 + y2) / 2 + ny * bend * len
        const toward = (x, y, r) => { const ux = cx - x, uy = cy - y, l = Math.hypot(ux, uy) || 1; return [x + (ux / l) * r, y + (uy / l) * r] }
        const p1 = bend ? toward(x1, y1, R) : [x1 + (dx / len) * R, y1 + (dy / len) * R]
        const p2 = bend ? toward(x2, y2, R + 1) : [x2 - (dx / len) * (R + 1), y2 - (dy / len) * (R + 1)]
        line('M' + p1 + ' Q' + cx + ',' + cy + ' ' + p2)
        const side = bend === 0 ? -1 : Math.sign(bend)
        // у прямых стрелок подпись чуть ближе к началу — пересекающиеся стрелки не путают подписи
        const t = bend === 0 ? 0.42 : 0.5
        const qx = (1 - t) * (1 - t) * p1[0] + 2 * t * (1 - t) * cx + t * t * p2[0]
        const qy = (1 - t) * (1 - t) * p1[1] + 2 * t * (1 - t) * cy + t * t * p2[1]
        label(qx + side * nx * 12, qy + side * ny * 12, text)
      }
      for (const st of spec.states) {
        const [id, name] = st
        const [x, y] = pos[id]
        el('circle', { cx: x, cy: y, r: R, fill: '#fff', stroke: COLOR, 'stroke-width': 1.6 }, svg)
        if ((spec.accept || []).includes(id)) el('circle', { cx: x, cy: y, r: R - 4, fill: 'none', stroke: COLOR, 'stroke-width': 1.3 }, svg)
        el('text', { x: x, y: y + 4.5, 'font-size': R > 24 ? 11 : 13, 'text-anchor': 'middle', 'font-style': 'italic', fill: '#111' }, svg).textContent = name
        if (id === spec.start) line('M' + (x - R - 34) + ',' + y + ' L' + (x - R - 2) + ',' + y)
      }
      if (spec.note) {
        const p = document.createElement('p')
        p.className = 'note'
        p.textContent = spec.note
        fig.appendChild(p)
      }
      document.getElementById('out').appendChild(fig)
      // подгоняем рамку под нарисованное (дуги и подписи не обрезаются)
      const bb = svg.getBBox()
      svg.setAttribute('viewBox', [bb.x - 12, bb.y - 12, bb.width + 24, bb.height + 24].join(' '))
      svg.style.maxWidth = (bb.width + 24) * 1.25 + 'px'
    }
`

export const fsaPage = (heading, script) => `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Диаграммы автоматов</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 16px; color: #1a1a1a; background: #fff; }
    h1 { font-size: 20px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 14px; }
    figure { margin: 0; border: 1px solid #ddd; border-radius: 10px; padding: 10px; overflow-x: auto; }
    figure.wide { grid-column: 1 / -1; }
    figcaption { font-size: 14px; font-weight: 600; margin-bottom: 4px; }
    .note { font-size: 13px; color: #555; margin: 6px 0 0; }
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
