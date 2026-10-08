// Выгружает ответы в dist-ready public/answers.json — по нему прокси (LXP AI) ищет задания.
// Запускается перед сборкой: npm run build.
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { disciplines } from '../src/data/disciplines.js'

const out = resolve(dirname(fileURLToPath(import.meta.url)), '../public/answers.json')
const data = disciplines
  .filter((d) => d.status === 'ready')
  .map((d) => ({
    id: d.id,
    name: d.name,
    teacher: d.teacher || '',
    answers: d.answers.map((a) => ({
      id: a.id,
      title: a.title,
      task: a.task || '',
      note: a.note || '',
      unique: a.unique || '',
      points: a.points ?? null,
      files: a.files.map((f) => ({ name: f.name, lang: f.lang || '', code: f.code })),
    })),
  }))
mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, JSON.stringify({ updated: new Date().toISOString(), disciplines: data }))
console.log(`answers.json: ${data.reduce((s, d) => s + d.answers.length, 0)} ответов`)
