// 인증 훅 — Firebase Auth 상태 추적 + 로그인/로그아웃/계정삭제 | 사용처→AuthContext.jsx, LoginPage.jsx
import { useState, useEffect, useCallback } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../services/firebase'
import { signInWithGoogle, signOutUser, onUserLogin, deleteUserAccount } from '../services/auth'

/**
 * Firebase Auth 상태 관리 Hook
 */
export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isNewUser, setIsNewUser] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Auth 성공 → 즉시 유저 설정 (Firestore는 백그라운드)
        setUser(firebaseUser)
        setError(null)
        setLoading(false)

        // Firestore 유저 문서 확인/생성 (비동기, 실패해도 앱 진행)
        try {
          const { isNewUser: newUser } = await onUserLogin(firebaseUser)
          setIsNewUser(newUser)
        } catch (err) {
          console.warn('Firestore user doc check failed:', err.message)
          // Firestore 실패해도 로그인은 유지
        }
      } else {
        setUser(null)
        setIsNewUser(false)
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [])

  const login = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      await signInWithGoogle()
      // onAuthStateChanged가 loading을 false로 설정함
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(err.message)
      }
      setLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await signOutUser()
    } catch (err) {
      setError(err.message)
    }
  }, [])

  const deleteAccount = useCallback(async () => {
    try {
      await deleteUserAccount()
    } catch (err) {
      setError(err.message)
      throw err
    }
  }, [])

  return {
    user,
    loading,
    error,
    isNewUser,
    login,
    logout,
    deleteAccount,
  }
}
