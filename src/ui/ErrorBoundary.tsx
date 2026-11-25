import { Component, type ErrorInfo, type ReactNode } from 'react'
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('Scene failed:', error, info) }
  render() {
    return this.state.failed
      ? <div className="error" role="alert">
          <div className="error-card glass-card">
            <h2>森林暂时迷失了方向</h2>
            <p>请确认浏览器已开启 WebGL 硬件加速，然后刷新页面重新进入。</p>
            <button type="button" className="primary" onClick={() => window.location.reload()}>重新载入森林<span className="arrow">→</span></button>
          </div>
        </div>
      : this.props.children
  }
}
