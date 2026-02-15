// 앱 진입점 — React 렌더링 시작, 글로벌 스타일 import | 스타일→styles/globals.css, 라우터→App.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
