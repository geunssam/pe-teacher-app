// 서류함 훅 — localStorage ↔ React 상태 동기화 (CustomEvent 크로스탭 지원) | 모든 훅의 기반. 키 목록→CLAUDE.md "데이터 저장 전략"
import { useState, useEffect } from 'react'

const LOCAL_STORAGE_SYNC_EVENT = 'pe-local-storage-sync'

function readLocalStorageValue(key, initialValue) {
  if (typeof window === 'undefined') {
    return initialValue
  }

  try {
    const item = window.localStorage.getItem(key)
    return item ? JSON.parse(item) : initialValue
  } catch (error) {
    console.error(`Error loading localStorage key "${key}":`, error)
    return initialValue
  }
}

/**
 * localStorage를 React 상태로 관리하는 Hook
 *
 * @param {string} key - localStorage 키
 * @param {any} initialValue - 초기값
 * @returns {[any, function]} [storedValue, setValue]
 */
export function useLocalStorage(key, initialValue) {
  // 상태 초기화 - localStorage에서 값 가져오기
  const [storedValue, setStoredValue] = useState(() => readLocalStorageValue(key, initialValue))

  // 값이 변경될 때마다 localStorage에 저장
  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    try {
      const serialized = JSON.stringify(storedValue)
      const current = window.localStorage.getItem(key)

      if (current === serialized) {
        return
      }

      window.localStorage.setItem(key, serialized)
      window.dispatchEvent(
        new CustomEvent(LOCAL_STORAGE_SYNC_EVENT, {
          detail: { key, value: storedValue },
        })
      )
    } catch (error) {
      console.error(`Error saving localStorage key "${key}":`, error)
    }
  }, [key, storedValue])

  // 같은 탭 내 여러 Hook 인스턴스 동기화 + 다른 탭 변경 동기화
  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const handleStorage = (event) => {
      if (event.key && event.key !== key) {
        return
      }
      setStoredValue(readLocalStorageValue(key, initialValue))
    }

    const handleCustomSync = (event) => {
      if (event?.detail?.key !== key) {
        return
      }

      setStoredValue((prev) => (Object.is(prev, event.detail.value) ? prev : event.detail.value))
    }

    window.addEventListener('storage', handleStorage)
    window.addEventListener(LOCAL_STORAGE_SYNC_EVENT, handleCustomSync)

    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener(LOCAL_STORAGE_SYNC_EVENT, handleCustomSync)
    }
  }, [key])

  return [storedValue, setStoredValue]
}

/**
 * localStorage에서 값 삭제 (Hook이 아닌 유틸리티)
 */
export function removeLocalStorageItem(key) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.removeItem(key)
  } catch (error) {
    console.error(`Error removing localStorage key "${key}":`, error)
  }
}
