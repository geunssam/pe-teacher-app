import { useState, useEffect } from 'react'

/**
 * localStorage를 React 상태로 관리하는 Hook
 *
 * @param {string} key - localStorage 키
 * @param {any} initialValue - 초기값
 * @returns {[any, function]} [storedValue, setValue]
 */
export function useLocalStorage(key, initialValue) {
  // 상태 초기화 - localStorage에서 값 가져오기
  const [storedValue, setStoredValue] = useState(() => {
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
  })

  // 값이 변경될 때마다 localStorage에 저장
  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue))
    } catch (error) {
      console.error(`Error saving localStorage key "${key}":`, error)
    }
  }, [key, storedValue])

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
