// Плоский список уроков поверх disciplines.js: навигация, подписи для меню,
// поиск, ссылки вида #/oop/oop12 и склонение числительных.
import { disciplines } from '../data/disciplines.js'

export const readyDisciplines = disciplines.filter((d) => d.status === 'ready')
export const soonDisciplines = disciplines.filter((d) => d.status !== 'ready')

// value «дисциплина::урок» — в том же формате его отдаёт BranchedMenu
export const lessons = readyDisciplines.flatMap((d) =>
  d.answers.map((a, i) => ({ value: `${d.id}::${a.id}`, d, a, index: i, total: d.answers.length }))
)

export const DEFAULT_VALUE = lessons.length ? lessons[0].value : disciplines[0].id

export function findLesson(value) {
  return lessons.find((l) => l.value === value) || null
}

export function findDiscipline(value) {
  const id = value.split('::')[0]
  return disciplines.find((d) => d.id === id) || null
}

// Короткая подпись для меню:
//   «КТ №5 — Класс с двумя переменными» → num «5», text «Класс с двумя переменными»
//   «КТ: DTD — «Использование DTD»»      → text «КТ: DTD» (в кавычках — имя задания в LXP)
export function menuLabel(title) {
  const [head, ...rest] = title.split(' — ')
  const tail = rest.join(' — ')
  if (!tail) return { num: '', text: title }
  const m = head.match(/^(?:КТ|Практическая работа)\s*№?\s*(\d+)$/)
  if (m) return { num: m[1], text: tail[0].toUpperCase() + tail.slice(1) }
  return { num: '', text: head }
}

// ---------- ссылки ----------
export function hashFromValue(value) {
  return '#/' + value.replace('::', '/')
}

export function valueFromHash(hash) {
  let path = hash.replace(/^#\/?/, '')
  try { path = decodeURIComponent(path) } catch { /* битая ссылка */ }
  const [did, aid] = path.split('/')
  if (!did) return null
  if (aid) return findLesson(`${did}::${aid}`) ? `${did}::${aid}` : null
  const d = disciplines.find((x) => x.id === did)
  if (!d) return null
  return d.status === 'ready' && d.answers.length ? `${d.id}::${d.answers[0].id}` : d.id
}

// ---------- поиск ----------
const norm = (s) => s.toLowerCase().replace(/ё/g, 'е')

const haystack = new Map(
  lessons.map((l) => [
    l.value,
    norm([l.d.name, l.a.title, l.a.task || '', ...l.a.files.map((f) => f.name)].join('\n')),
  ])
)

export function queryWords(query) {
  return norm(query).trim().split(/\s+/).filter(Boolean)
}

export function searchLessons(query) {
  const words = queryWords(query)
  if (!words.length) return []
  return lessons.filter((l) => words.every((w) => haystack.get(l.value).includes(w)))
}

// ---------- склонение: plural(3, ['балл', 'балла', 'баллов']) → 'балла' ----------
export function plural(n, [one, few, many]) {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return one
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few
  return many
}
