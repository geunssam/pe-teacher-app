// 행정실장 훅 — 위치, 측정소, 앱 환경설정 (Firestore + localStorage fallback) | 사용처→SettingsPage/WeatherPage/HomePage
import { useCallback, useEffect, useRef } from 'react'
import { useLocalStorage, removeLocalStorageItem } from './useLocalStorage'
import { getUid } from './useDataSource'
import { setDocument, getDocument } from '../services/firestore'

const SETTINGS_KEY = 'pe-teacher-settings'

const DEFAULT_SETTINGS = {
  nickname: '',
  location: {
    name: '학교 이름',
    address: null,
    lat: 36.3504,
    lon: 127.3845,
    stationName: '대전',
  },
  recommend: {
    priorityOrder: ['weather', 'continuity', 'space', 'domainBalance'],
    availableSpaces: ['운동장', '체육관', '교실'],
    specialEvents: [],
  },
  lastUpdated: null,
}

/**
 * 앱 설정 관리 Hook
 * - 학교 위치 (주소, 좌표, 측정소)
 * - 기타 사용자 설정
 * - useLocalStorage 기반 크로스탭 동기화 지원
 * - 인증 시 Firestore에도 저장
 */
export function useSettings() {
  const [settings, setSettings] = useLocalStorage(SETTINGS_KEY, DEFAULT_SETTINGS)
  const firestoreLoaded = useRef(false)

  // Load from Firestore on mount (if authenticated)
  useEffect(() => {
    const uid = getUid()
    if (!uid || firestoreLoaded.current) return
    firestoreLoaded.current = true

    async function loadFromFirestore() {
      try {
        const userDoc = await getDocument(`users/${uid}`)
        if (userDoc?.settings) {
          setSettings(userDoc.settings)
        }
      } catch (err) {
        console.warn('[useSettings] Firestore load failed, using localStorage:', err.message)
      }
    }

    loadFromFirestore()
  }, [])

  // Sync to Firestore when authenticated
  const syncToFirestore = useCallback((newSettings) => {
    const uid = getUid()
    if (uid) {
      setDocument(`users/${uid}`, { settings: newSettings }, true).catch((err) => {
        console.error('Failed to sync settings to Firestore:', err)
      })
    }
  }, [])

  /**
   * 위치 정보 업데이트
   * @param {Object} location - { name, address, lat, lon, stationName }
   */
  const updateLocation = useCallback((location) => {
    setSettings((prev) => {
      const next = {
        ...prev,
        location: {
          ...prev.location,
          ...location,
        },
        lastUpdated: new Date().toISOString(),
      }
      syncToFirestore(next)
      return next
    })
  }, [setSettings, syncToFirestore])

  /**
   * 닉네임 업데이트
   * @param {string} nickname
   */
  const updateNickname = useCallback((nickname) => {
    setSettings((prev) => {
      const next = { ...prev, nickname, lastUpdated: new Date().toISOString() }
      syncToFirestore(next)
      return next
    })
  }, [setSettings, syncToFirestore])

  /**
   * 추천 설정 업데이트
   * @param {Object} updates - { priorityOrder?, availableSpaces?, specialEvents? }
   */
  const updateRecommendSettings = useCallback((updates) => {
    setSettings((prev) => {
      const next = {
        ...prev,
        recommend: {
          ...(prev.recommend || DEFAULT_SETTINGS.recommend),
          ...updates,
        },
        lastUpdated: new Date().toISOString(),
      }
      syncToFirestore(next)
      return next
    })
  }, [setSettings, syncToFirestore])

  /**
   * 설정 초기화
   */
  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS)
    removeLocalStorageItem(SETTINGS_KEY)
    syncToFirestore(DEFAULT_SETTINGS)
  }, [setSettings, syncToFirestore])

  /**
   * 위치 설정 여부 확인
   */
  const hasLocationSet = useCallback(() => {
    return settings.location.address !== null
  }, [settings.location.address])

  return {
    settings,
    nickname: settings.nickname || '',
    location: settings.location,
    recommendSettings: settings.recommend || DEFAULT_SETTINGS.recommend,
    updateNickname,
    updateLocation,
    updateRecommendSettings,
  }
}
