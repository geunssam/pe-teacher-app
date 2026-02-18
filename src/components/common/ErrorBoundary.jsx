// 에러 바운더리 — 하위 컴포넌트 렌더링 오류 캐치 + 복구 UI 표시
import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-[40vh] flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-lg font-bold text-text mb-2">
              문제가 발생했습니다
            </h2>
            <p className="text-sm text-textMuted mb-4">
              {this.state.error?.message || '알 수 없는 오류가 발생했습니다'}
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={this.handleReset}
                className="py-2 px-4 rounded-lg font-semibold transition-all text-sm"
                style={{ backgroundColor: '#B3D9FF', color: '#1E5A9E' }}
              >
                다시 시도
              </button>
              <button
                onClick={() => window.location.reload()}
                className="py-2 px-4 bg-white/60 text-text rounded-lg font-medium transition-all border border-white/80 text-sm"
              >
                새로고침
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
