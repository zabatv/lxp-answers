// Готовит HTML из ответа к запуску прямо на сайте: подставляет style.css / script.js
// из того же задания вместо <link>/<script src>, а переходы по ссылкам и отправку форм
// гасит, чтобы во фрейме не открывался сам сайт.

const GUARD =
  '<script>(function(){' +
  "document.addEventListener('click',function(e){" +
  "var a=e.target.closest&&e.target.closest('a[href]');" +
  "if(a&&a.getAttribute('href').charAt(0)!=='#')e.preventDefault()},true);" +
  "document.addEventListener('submit',function(e){e.preventDefault()},true)" +
  '})()</script>'

// ссылка вида style.css, ./css/style.css → файл задания с таким именем
function siblingFile(files, ref) {
  if (!ref || /^([a-z]+:)?\/\//i.test(ref)) return null
  const path = ref.split(/[?#]/)[0].replace(/^\.\//, '').toLowerCase()
  const base = path.split('/').pop()
  return files.find((f) => f.name.toLowerCase() === path) || files.find((f) => f.name.toLowerCase() === base) || null
}

function injectGuard(html) {
  for (const re of [/<head\b[^>]*>/i, /<html\b[^>]*>/i, /^\s*<!doctype[^>]*>/i]) {
    if (re.test(html)) return html.replace(re, (tag) => tag + GUARD)
  }
  return GUARD + html
}

export function buildPreview(html, files) {
  const withCss = html.replace(/<link\b[^>]*>/gi, (tag) => {
    if (!/\brel\s*=\s*["']?stylesheet/i.test(tag)) return tag
    const href = (tag.match(/\bhref\s*=\s*["']([^"']*)["']/i) || [])[1]
    const f = siblingFile(files, href)
    return f ? `<style>/* ${f.name} */\n${f.code.replace(/<\/style/gi, '<\\/style')}\n</style>` : tag
  })
  const withJs = withCss.replace(
    /<script\b([^>]*?)\ssrc\s*=\s*["']([^"']*)["']([^>]*)>\s*<\/script>/gi,
    (tag, before, src, after) => {
      const f = siblingFile(files, src)
      return f ? `<script${before}${after}>\n${f.code.replace(/<\/script/gi, '<\\/script')}\n</script>` : tag
    }
  )
  return injectGuard(withJs)
}

// есть ли картинки/фоны по относительным путям (их во фрейме не будет)
export function usesLocalAssets(doc) {
  return /<img\b[^>]*\ssrc\s*=\s*["'](?!https?:|data:|\/\/)[^"']+["']|url\(\s*["']?(?!https?:|data:|\/\/|#)[^)"'\s]+/i.test(doc)
}
