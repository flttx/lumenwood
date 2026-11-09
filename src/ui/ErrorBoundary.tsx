import { Component, type ErrorInfo, type ReactNode } from 'react'
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('Scene failed:', error, info) }
  render() { return this.state.failed ? <div className="error" role="alert"><h2>森林暂时无法加载</h2><p>请确认浏览器支持 WebGL，然后刷新页面重试。</p><button onClick={() => window.location.reload()}>刷新页面</button></div> : this.props.children }
}
