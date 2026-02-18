// 공통 로딩 스피너 — Suspense fallback + 데이터 로딩 대기 시 사용

export default function LoadingSpinner({ message = '로딩 중...' }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-textMuted">{message}</p>
      </div>
    </div>
  )
}
