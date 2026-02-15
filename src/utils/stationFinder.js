// 측정소 검색 — 좌표 기반 가장 가까운 대기오염 측정소 찾기 (fallback 포함) | 사용처→hooks/useLocationPicker.js, API→services/weather/stationSearch.js
import { findNearbyStations } from '../services/weather'

/**
 * 측정소 검색 with fallback
 * hint를 이용해 1차 조회 → 실패 시 hint 없이 재시도
 * @param {number} lat - 위도
 * @param {number} lon - 경도
 * @param {string} hint - 주소/이름 힌트 (측정소 조회 시 사용)
 * @returns {Promise<Array>} 근처 측정소 목록
 */
export async function findStationsWithFallback(lat, lon, hint = '') {
  try {
    const primary = await findNearbyStations(lat, lon, hint, 3)
    if (Array.isArray(primary) && primary.length > 0) {
      return primary
    }
  } catch (error) {
    console.warn('측정소 1차 조회 실패, fallback 시도:', error)
  }

  return findNearbyStations(lat, lon, '', 3)
}
