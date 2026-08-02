import { Component, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// GitHub Pages serves its 404 page for a refreshed client-side route. Restore
// the requested route before React mounts so the app can render it normally.
const redirectedPath = sessionStorage.getItem('spa-redirect')
if (redirectedPath) {
  sessionStorage.removeItem('spa-redirect')
  window.history.replaceState(null, '', redirectedPath)
}

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
