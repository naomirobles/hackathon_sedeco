import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { GuideProvider } from './guide/index.ts'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GuideProvider>
      <App />
    </GuideProvider>
  </React.StrictMode>,
)
