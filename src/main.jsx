import React from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource-variable/onest'
import '@fontsource-variable/jetbrains-mono'
import '@fontsource-variable/jetbrains-mono/wght-italic.css'
import '@fontsource-variable/unbounded'
import LoginGate from './components/LoginGate.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LoginGate />
  </React.StrictMode>,
)
