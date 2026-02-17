// 로그인 페이지 — Google 로그인 버튼 + classpet 디자인 | 진입조건→App.jsx(미인증 시)
import { useAuthContext } from '../contexts/AuthContext'

export default function LoginPage() {
  const { login, loading, error } = useAuthContext()

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-white">
      <div
        className="max-w-sm w-full p-8 rounded-3xl border border-white/60"
        style={{
          background: 'linear-gradient(145deg, rgba(255,255,255,0.55), rgba(255,255,255,0.2))',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        }}
      >
        {/* App title */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">&#9917;</div>
          <h1 className="text-2xl font-bold text-text mb-2">
            오늘 체육 뭐하지?
          </h1>
          <p className="text-sm text-textMuted">
            체육 수업, 이제 쉽게 준비하세요
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-danger/10 rounded-xl border border-danger/30 text-sm text-danger text-center">
            {error}
          </div>
        )}

        {/* Google login button */}
        <button
          onClick={login}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-xl font-semibold text-sm transition-all border border-gray-200 hover:border-gray-300 hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed bg-white text-gray-700"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          ) : (
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
          )}
          {loading ? '로그인 중...' : 'Google로 시작하기'}
        </button>

        {/* Footer */}
        <p className="text-center text-xs text-textMuted mt-6">
          로그인하면 수업 데이터가 클라우드에 안전하게 저장됩니다
        </p>
      </div>
    </div>
  )
}
