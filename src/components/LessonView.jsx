import { useMemo, useState } from 'react'
import {
  Alert02Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Download04Icon,
  File02Icon,
  StarIcon,
  Task01Icon,
  UserEdit01Icon,
} from '@hugeicons/core-free-icons'
import { archiveName, downloadZip } from '../lib/files.js'
import { langMeta } from '../lib/highlight.js'
import { plural } from '../lib/lessons.js'
import CodeBlock from './CodeBlock.jsx'
import Icon from './Icon.jsx'
import SpotlightCard from './reactbits/SpotlightCard.jsx'

function PagerCard({ lesson, dir, current, onSelect }) {
  if (!lesson) return <span className="pager-spacer" />
  const { num, text } = lesson.label
  const otherDiscipline = lesson.d.id !== current.d.id
  return (
    <SpotlightCard
      as="button"
      type="button"
      className={`pager-card pager-card--${dir}`}
      onClick={() => onSelect(lesson.value)}
      title={lesson.a.title}
    >
      <span className="pager-dir">
        {dir === 'prev' && <Icon icon={ArrowLeft01Icon} size={14} />}
        {dir === 'prev' ? 'Назад' : 'Далее'}
        {dir === 'next' && <Icon icon={ArrowRight01Icon} size={14} />}
      </span>
      <span className="pager-title">
        {num && <span className="pager-num">№{num}</span>}
        {text}
      </span>
      {otherDiscipline && <span className="pager-disc">{lesson.d.name}</span>}
    </SpotlightCard>
  )
}

export default function LessonView({ lesson, prev, next, onSelect }) {
  const { d, a, index, total } = lesson
  const langs = [...new Set(a.files.map((f) => langMeta(f.lang).label))]

  // текущий текст файлов (с правками LXP AI) — его скачивают и запускают
  const [edits, setEdits] = useState({})
  const files = useMemo(
    () => a.files.map((f) => (f.name in edits ? { ...f, code: edits[f.name] } : f)),
    [a.files, edits]
  )
  const setFile = (name, code) => setEdits((prev) => ({ ...prev, [name]: code }))

  // решение зависит от данных конкретного студента (вариант, условие от преподавателя…)
  const hasUnique = Boolean(a.unique) || a.files.some((f) => f.unique)

  // что LXP AI узнаёт о задании вместе с просьбой — чтобы пересчитал тем же методом
  const contextFor = (f) =>
    [
      `Дисциплина: ${d.name}`,
      `Задание: ${a.title}`,
      a.task && `Условие: ${a.task}`,
      a.note && `Пометка: ${a.note}`,
      a.unique && `Уникальные данные задания: ${a.unique}`,
      f.unique && `Уникальные данные в файле ${f.name}: ${f.unique}`,
    ]
      .filter(Boolean)
      .join('\n')

  return (
    <article className="lesson">
      <header className="lesson-head">
        <div className="crumbs">
          <span className="crumb-disc">{d.name}</span>
          {d.teacher && (
            <>
              <span className="crumb-sep" aria-hidden="true">/</span>
              <span>{d.teacher}</span>
            </>
          )}
          <span className="crumb-pos">
            Задание {index + 1} из {total}
          </span>
        </div>

        <h1 className="lesson-title">{a.title}</h1>

        <div className="chips">
          {a.points != null && (
            <span className="chip chip--points">
              <Icon icon={StarIcon} size={14} />
              {a.points} {plural(a.points, ['балл', 'балла', 'баллов'])}
            </span>
          )}
          <span className="chip">
            <Icon icon={File02Icon} size={14} />
            {a.files.length} {plural(a.files.length, ['файл', 'файла', 'файлов'])} · {langs.join(', ')}
          </span>
          {a.note && (
            <span className="chip chip--todo">
              <Icon icon={Alert02Icon} size={14} />
              Нужно доделать
            </span>
          )}
          {hasUnique && (
            <span className="chip chip--unique">
              <Icon icon={UserEdit01Icon} size={14} />
              Свои данные
            </span>
          )}
        </div>
      </header>

      {a.task && (
        <SpotlightCard className="task-card">
          <div className="section-label">
            <Icon icon={Task01Icon} size={14} />
            Задание
          </div>
          <p className="task-text">{a.task}</p>
        </SpotlightCard>
      )}

      {a.note && (
        <div className="callout" role="note">
          <Icon icon={Alert02Icon} size={18} />
          <div>
            <strong>Что доделать</strong>
            <p>{a.note}</p>
          </div>
        </div>
      )}

      {hasUnique && (
        <div className="callout callout--unique" role="note">
          <Icon icon={UserEdit01Icon} size={18} />
          <div>
            <strong>Уникальные данные</strong>
            {a.unique && <p>{a.unique}</p>}
            <p className="callout-hint">
              Где решение зависит от твоих данных, у файла стоит метка «свои данные». Нажми у него LXP AI
              и впиши своё условие — он пересчитает решение тем же методом: условие задания и пометки
              уходят ему вместе с просьбой.
            </p>
          </div>
        </div>
      )}

      <section className="files" aria-label="Решение">
        <div className="files-head">
          <div className="section-label">
            Решение
            <span className="count">{files.length}</span>
          </div>
          {files.length > 1 && (
            <button
              type="button"
              className="btn btn-sm"
              title="Скачать все файлы задания одним архивом"
              onClick={() => downloadZip(archiveName(a.title), files)}
            >
              <Icon icon={Download04Icon} size={15} />
              Скачать всё
              <span className="btn-note">.zip</span>
            </button>
          )}
        </div>
        {files.map((f, i) => (
          <CodeBlock
            key={f.name}
            name={f.name}
            lang={f.lang}
            code={f.code}
            original={a.files[i].code}
            onChange={(code) => setFile(f.name, code)}
            files={files}
            unique={f.unique}
            context={contextFor(f)}
          />
        ))}
      </section>

      <nav className="pager" aria-label="Соседние задания">
        <PagerCard lesson={prev} dir="prev" current={lesson} onSelect={onSelect} />
        <PagerCard lesson={next} dir="next" current={lesson} onSelect={onSelect} />
      </nav>
    </article>
  )
}
