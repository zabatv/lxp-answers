import { Fragment } from 'react'
import { ArrowRight01Icon } from '@hugeicons/core-free-icons'
import Icon from './Icon.jsx'
import LatticeLoader from './reactbits/LatticeLoader.jsx'

// слова через дефис («Prompt-Engineering») не разрываем при переносе строки
function KeepHyphenated({ text }) {
  return text.split(' ').map((word, i) => (
    <Fragment key={i}>
      {i > 0 && ' '}
      {word.includes('-') ? <span className="nowrap">{word}</span> : word}
    </Fragment>
  ))
}

// Заглушка для дисциплины, по которой ответов ещё нет.
export default function SoonView({ discipline, onOpenReady }) {
  return (
    <div className="soon">
      <div className="soon-card">
        <LatticeLoader
          label="Ответы готовятся"
          pattern="spiral"
          showTimer={false}
          color="var(--accent)"
          cellSize={7}
          gap={3}
          fontSize={13}
          className="soon-loader"
        />
        <h1 className="soon-title">
          <KeepHyphenated text={discipline ? discipline.name : 'Раздел'} />
        </h1>
        {discipline && discipline.teacher && <p className="soon-teacher">Преподаватель: {discipline.teacher}</p>}
        <p className="soon-text">Раздел в разработке — ответы появятся здесь, как только будут готовы.</p>
        <button type="button" className="btn btn-primary btn-lg" onClick={onOpenReady}>
          Открыть готовые ответы
          <Icon icon={ArrowRight01Icon} size={16} />
        </button>
      </div>
    </div>
  )
}
