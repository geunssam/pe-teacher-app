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
 * localStorage에서 직접 값 읽기 (Hook이 아닌 유틸리티)
 */
export function getLocalStorageItem(key, defaultValue = null) {
  if (typeof window === 'undefined') {
    return defaultValue
  }

  try {
    const item = window.localStorage.getItem(key)
    return item ? JSON.parse(item) : defaultValue
  } catch (error) {
    console.error(`Error reading localStorage key "${key}":`, error)
    return defaultValue
  }
}

/**
 * localStorage에 직접 값 쓰기 (Hook이 아닌 유틸리티)
 */
export function setLocalStorageItem(key, value) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.error(`Error writing localStorage key "${key}":`, error)
  }
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
