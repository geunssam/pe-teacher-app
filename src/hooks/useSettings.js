// 행정실장 훅 — 위치, 측정소, 앱 환경설정 (useLocalStorage 기반) | 사용처→SettingsPage/WeatherPage/HomePage, 저장소→useLocalStorage.js
import { useLocalStorage, removeLocalStorageItem } from './useLocalStorage'

const SETTINGS_KEY = 'pe-teacher-settings'

const DEFAULT_SETTINGS = {
  location: {
    name: '학교 이름',
    address: null,
    lat: 36.3504,
    lon: 127.3845,
    stationName: '대전',
  },
  lastUpdated: null,
}

/**
 * 앱 설정 관리 Hook
 * - 학교 위치 (주소, 좌표, 측정소)
 * - 기타 사용자 설정
 * - useLocalStorage 기반 크로스탭 동기화 지원
 */
export function useSettings() {
  const [settings, setSettings] = useLocalStorage(SETTINGS_KEY, DEFAULT_SETTINGS)

  /**
   * 위치 정보 업데이트
   * @param {Object} location - { name, address, lat, lon, stationName }
   */
  const updateLocation = (location) => {
    setSettings((prev) => ({
      ...prev,
      location: {
        ...prev.location,
        ...location,
      },
      lastUpdated: new Date().toISOString(),
    }))
  }

  /**
   * 설정 초기화
   */
  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS)
    removeLocalStorageItem(SETTINGS_KEY)
  }

  /**
   * 위치 설정 여부 확인
   */
  const hasLocationSet = () => {
    return settings.location.address !== null
  }

  return {
    settings,
    location: settings.location,
    updateLocation,
    resetSettings,
    hasLocationSet,
  }
}
