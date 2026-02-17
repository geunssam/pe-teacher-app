// Auth 컨텍스트 — 앱 전체에 인증 상태 제공 | 사용처→App.jsx(Provider), 각 페이지(useAuthContext)
import { createContext, useContext } from 'react'
import { useAuth } from '../hooks/useAuth'

const AuthContext = createContext(null)

/**
 * AuthProvider — App 최상위에서 인증 상태를 제공
 */
export function AuthProvider({ children }) {
  const authState = useAuth()

  return (
    <AuthContext.Provider value={authState}>
      {children}
    </AuthContext.Provider>
  )
}

/**
 * useAuthContext — 컴포넌트에서 인증 상태 사용
 */
export function useAuthContext() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider')
  }
  return context
}
