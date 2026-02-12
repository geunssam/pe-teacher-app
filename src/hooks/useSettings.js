import { useState, useEffect } from 'react'

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
 */
export function useSettings() {
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem(SETTINGS_KEY)
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS
  })

  // localStorage에 자동 저장
  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  }, [settings])

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
    localStorage.removeItem(SETTINGS_KEY)
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
