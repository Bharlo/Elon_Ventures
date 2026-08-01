import { Component, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

class AppErrorBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() { return { failed: true } }

  render() {
    if (this.state.failed) {
      return <main className="app-recovery"><p>ORBITAL / SYSTEM STATUS</p><h1>We hit a temporary interruption.</h1><button onClick={() => window.location.reload()}>Reload experience</button></main>
    }
    return this.props.children
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppErrorBoundary><App /></AppErrorBoundary>
  </StrictMode>,
)
