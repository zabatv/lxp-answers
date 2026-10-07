import { lazy, Suspense, useState } from 'react'
import { Brand } from './Brand.jsx'

// Сайт с ответами открывается только после входа. В коде хранится не пароль,
// а SHA-256 от «lxpleak:логин:пароль»; сами ответы грузятся отдельным чанком уже после входа.
const App = lazy(() => import('../App.jsx'))

const CREDENTIAL_HASH = 'b7021fe585a3a9881f256c99ae33b1a524661c2bc738ea62811f3830d753bdd9'
const STORAGE_KEY = 'lxp-auth'

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function readAuth() {
  try {
    return localStorage.getItem(STORAGE_KEY) === CREDENTIAL_HASH || sessionStorage.getItem(STORAGE_KEY) === CREDENTIAL_HASH
  } catch {
    return false
  }
}

export function logout() {
  try {
    localStorage.removeItem(STORAGE_KEY)
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    /* хранилище недоступно — просто перезагрузим */
  }
  window.location.reload()
}

export default function LoginGate() {
  const [authed, setAuthed] = useState(readAuth)
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (authed) {
    return (
      <Suspense fallback={<div className="login-screen" aria-busy="true" />}>
        <App />
      </Suspense>
    )
  }

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    const hash = await sha256(`lxpleak:${login.trim()}:${password}`)
    if (hash === CREDENTIAL_HASH) {
      try {
        ;(remember ? localStorage : sessionStorage).setItem(STORAGE_KEY, hash)
      } catch {
        /* без хранилища вход действует до перезагрузки */
      }
      setAuthed(true)
    } else {
      setError('Неверный логин или пароль')
      setPassword('')
    }
    setBusy(false)
  }

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={submit}>
        <Brand />
        <h1 className="login-title">Вход</h1>
        <label className="login-field">
          <span>Логин</span>
          <input autoComplete="username" autoFocus value={login} onChange={(e) => setLogin(e.target.value)} required />
        </label>
        <label className="login-field">
          <span>Пароль</span>
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <label className="login-remember">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          Запомнить на этом устройстве
        </label>
        {error && (
          <p className="login-error" role="alert">
            {error}
          </p>
        )}
        <button className="btn btn-primary btn-lg login-submit" type="submit" disabled={busy}>
          {busy ? 'Проверяю…' : 'Войти'}
        </button>
      </form>
    </div>
  )
}
