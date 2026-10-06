import { useState } from 'react'
import { disciplines } from './data/disciplines.js'
import Squares from './components/reactbits/Squares.jsx'
import GradientText from './components/reactbits/GradientText.jsx'
import ShinyText from './components/reactbits/ShinyText.jsx'
import SpotlightCard from './components/reactbits/SpotlightCard.jsx'
import CodeBlock from './components/CodeBlock.jsx'

export default function App() {
  const [activeId, setActiveId] = useState('xml')
  const active = disciplines.find((d) => d.id === activeId) || disciplines[0]

  return (
    <div className="app">
      <div className="bg">
        <Squares />
      </div>

      <header className="hero">
        <div className="badge">
          <ShinyText text="LXP IThub · 2ИТП1.9.25" speed={4} />
        </div>
        <h1 className="title">
          <GradientText animationSpeed={7}>Ответы по дисциплинам</GradientText>
        </h1>
        <p className="subtitle">
          Готовые решения контрольных точек и домашних заданий. Выбери дисциплину.
        </p>
      </header>

      <nav className="tabs" role="tablist">
        {disciplines.map((d) => (
          <button
            key={d.id}
            role="tab"
            aria-selected={d.id === activeId}
            className={`tab ${d.id === activeId ? 'active' : ''} ${
              d.status === 'ready' ? 'has-content' : ''
            }`}
            onClick={() => setActiveId(d.id)}
          >
            <span className="tab-name">{d.name}</span>
            {d.status === 'ready' ? (
              <span className="tab-dot ready" title="Есть ответы" />
            ) : (
              <span className="tab-dot soon" title="В разработке" />
            )}
          </button>
        ))}
      </nav>

      <main className="content">
        <div className="discipline-head">
          <h2>{active.name}</h2>
          {active.teacher && <span className="teacher">{active.teacher}</span>}
        </div>

        {active.status === 'ready' ? (
          <div className="answers">
            {active.answers.map((a) => (
              <SpotlightCard key={a.id} className="answer">
                <div className="answer-head">
                  <h3>{a.title}</h3>
                  {a.points != null && (
                    <span className="points">{a.points} баллов</span>
                  )}
                </div>
                {a.task && <p className="task">{a.task}</p>}
                <div className="files">
                  {a.files.map((f) => (
                    <CodeBlock key={f.name} name={f.name} lang={f.lang} code={f.code} />
                  ))}
                </div>
              </SpotlightCard>
            ))}
          </div>
        ) : (
          <SpotlightCard className="placeholder">
            <div className="placeholder-inner">
              <div className="placeholder-icon">⌛</div>
              <h3>Раздел в разработке</h3>
              <p>
                Вкладка для «{active.name}» уже готова — ответы появятся здесь позже.
              </p>
            </div>
          </SpotlightCard>
        )}
      </main>

      <footer className="footer">
        <ShinyText text="Собрано автоматически · обновляется по мере добавления ответов" speed={6} />
      </footer>
    </div>
  )
}
