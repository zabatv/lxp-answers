import { useEffect, useState } from 'react'
import { ComputerIcon, LinkSquare02Icon, ReloadIcon, SmartPhone01Icon } from '@hugeicons/core-free-icons'
import { usesLocalAssets } from '../lib/preview.js'
import Icon from './Icon.jsx'

// «Окно браузера» с запущенным HTML. Фрейм изолирован (sandbox без allow-same-origin):
// скрипты из ответа работают, но до сайта и его данных не дотягиваются.
export default function HtmlPreview({ doc, name }) {
  const [device, setDevice] = useState('desktop')
  const [run, setRun] = useState(0)

  // для «Открыть в новой вкладке» — обычная ссылка на blob: её не режет блокировщик всплывающих окон
  const [tabUrl, setTabUrl] = useState('')
  useEffect(() => {
    const url = URL.createObjectURL(new Blob([doc], { type: 'text/html;charset=utf-8' }))
    setTabUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [doc])

  return (
    <div className="preview">
      <div className="preview-bar">
        <span className="preview-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="preview-url" title={name}>
          {name}
        </span>
        <div className="seg" role="group" aria-label="Ширина экрана">
          <button
            type="button"
            aria-pressed={device === 'desktop'}
            aria-label="Как на компьютере"
            title="Как на компьютере"
            onClick={() => setDevice('desktop')}
          >
            <Icon icon={ComputerIcon} size={15} />
          </button>
          <button
            type="button"
            aria-pressed={device === 'phone'}
            aria-label="Как на телефоне"
            title="Как на телефоне"
            onClick={() => setDevice('phone')}
          >
            <Icon icon={SmartPhone01Icon} size={15} />
          </button>
        </div>
        <button
          type="button"
          className="icon-btn icon-btn--sm"
          aria-label="Перезапустить"
          title="Перезапустить"
          onClick={() => setRun((n) => n + 1)}
        >
          <Icon icon={ReloadIcon} size={15} />
        </button>
        <a
          className="icon-btn icon-btn--sm"
          href={tabUrl || undefined}
          target="_blank"
          rel="noopener"
          aria-label="Открыть в новой вкладке"
          title="Открыть в новой вкладке"
        >
          <Icon icon={LinkSquare02Icon} size={15} />
        </a>
      </div>

      <div className="preview-stage" data-device={device}>
        <iframe
          key={run}
          className="preview-frame"
          title={`Результат: ${name}`}
          srcDoc={doc}
          sandbox="allow-scripts allow-forms allow-modals"
          referrerPolicy="no-referrer"
        />
      </div>

      {usesLocalAssets(doc) && (
        <p className="preview-hint">Картинки из папки проекта здесь не подгружаются — на их месте будет пусто.</p>
      )}
    </div>
  )
}
