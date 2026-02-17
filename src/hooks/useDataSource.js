// 데이터소스 어댑터 훅 — 인증 상태에 따라 Firestore/localStorage 자동 선택 | 사용처→useClassManager, useSchedule, useSettings 등
import { useState, useEffect, useCallback, useRef } from 'react'
import { auth } from '../services/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import {
  getDocument,
  setDocument,
  subscribeDocument,
  createDebouncedWriter,
} from '../services/firestore'
import { useLocalStorage } from './useLocalStorage'

/**
 * Get current authenticated user's UID (non-hook utility)
 * @returns {string|null}
 */
export function getUid() {
  return auth.currentUser?.uid || null
}

/**
 * useFirestoreDoc — Firestore 문서를 React 상태로 관리
 * Authenticated 시 Firestore, 아닐 시 localStorage fallback
 *
 * @param {string} localStorageKey - localStorage 키 (fallback)
 * @param {function} pathBuilder - (uid) => Firestore document path
 * @param {any} defaultValue - 기본값
 * @param {{ subscribe?: boolean, debounceMs?: number }} options
 */
export function useFirestoreDoc(localStorageKey, pathBuilder, defaultValue, options = {}) {
  const { subscribe = false, debounceMs = 1000 } = options

  // localStorage fallback (always active as base)
  const [localValue, setLocalValue] = useLocalStorage(localStorageKey, defaultValue)

  // Auth and Firestore state
  const [uid, setUid] = useState(getUid())
  const [firestoreValue, setFirestoreValue] = useState(null)
  const [firestoreLoaded, setFirestoreLoaded] = useState(false)
  const debouncedWriter = useRef(createDebouncedWriter(debounceMs))

  // Track auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUid(user?.uid || null)
      if (!user) {
        setFirestoreValue(null)
        setFirestoreLoaded(false)
      }
    })
    return () => unsubscribe()
  }, [])

  // Load/subscribe Firestore data when authenticated
  useEffect(() => {
    if (!uid) return

    const path = pathBuilder(uid)
    if (!path) return

    if (subscribe) {
      // Real-time subscription
      const unsubscribe = subscribeDocument(path, (data) => {
        setFirestoreValue(data)
        setFirestoreLoaded(true)
      })
      return () => unsubscribe()
    } else {
      // One-time fetch
      getDocument(path)
        .then((data) => {
          setFirestoreValue(data)
          setFirestoreLoaded(true)
        })
        .catch((err) => {
          console.error(`Failed to load Firestore doc ${path}:`, err)
          setFirestoreLoaded(true)
        })
    }
  }, [uid, pathBuilder, subscribe])

  // Determine which value to use
  const isFirestore = uid && firestoreLoaded
  const value = isFirestore ? (firestoreValue ?? defaultValue) : localValue

  // Setter that writes to appropriate store
  const setValue = useCallback(
    (updater) => {
      const newValue = typeof updater === 'function' ? updater(value) : updater

      if (uid) {
        const path = pathBuilder(uid)
        if (path) {
          // Write to Firestore (debounced)
          debouncedWriter.current(path, newValue)
        }
        setFirestoreValue(newValue)
      }

      // Always update localStorage as fallback
      setLocalValue(newValue)
    },
    [uid, value, pathBuilder, setLocalValue]
  )

  return [value, setValue, { isFirestore, firestoreLoaded }]
}
