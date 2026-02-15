// 시설관리 훅 — GPS 감지, 지도 위치 선택, 측정소 확정 (날씨탭/설정 공유) | 사용처→WeatherPage/SettingsPage, 측정소검색→utils/stationFinder.js, 지도→components/settings/LocationMapPicker.jsx
import { useState } from 'react'
import { findStationsWithFallback } from '../utils/stationFinder'
import { useSettings } from './useSettings'
import toast from 'react-hot-toast'

/**
 * 위치 선택 공통 로직 훅
 * WeatherPage와 SettingsPage에서 공유하는 위치/측정소 선택 플로우를 통합
 *
 * 플로우: GPS 감지 or 지도 선택 → 근처 측정소 조회 → StationPicker → 확정
 */
export function useLocationPicker() {
  const { location, updateLocation } = useSettings()

  const [detecting, setDetecting] = useState(false)
  const [showMapPicker, setShowMapPicker] = useState(false)
  const [pendingLocation, setPendingLocation] = useState(null)
  const [nearbyStations, setNearbyStations] = useState([])
  const [stationPickerSource, setStationPickerSource] = useState('gps')

  /** GPS 현재 위치 감지 */
  const detectCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('위치 서비스를 지원하지 않는 브라우저입니다')
      return
    }
    setDetecting(true)
    toast.loading('현재 위치를 확인하는 중...')

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude
        const lon = position.coords.longitude
        try {
          const address = '현재 위치(자동 감지)'
          const stations = await findStationsWithFallback(lat, lon, '')
          toast.dismiss()
          setPendingLocation({
            name: '현재 위치',
            address: address || '현재 위치(자동 감지)',
            lat,
            lon,
          })
          setNearbyStations(stations)
          setStationPickerSource('gps')
        } catch {
          toast.dismiss()
          toast.error('측정소 조회에 실패했습니다')
        } finally {
          setDetecting(false)
        }
      },
      (error) => {
        toast.dismiss()
        setDetecting(false)
        switch (error.code) {
          case error.PERMISSION_DENIED:
            toast.error('위치 권한이 거부되었습니다')
            break
          case error.POSITION_UNAVAILABLE:
            toast.error('위치 정보를 사용할 수 없습니다')
            break
          case error.TIMEOUT:
            toast.error('위치 확인 시간이 초과되었습니다')
            break
          default:
            toast.error('위치 확인 중 오류가 발생했습니다')
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  /** 지도에서 위치 선택 */
  const selectFromMap = async (lat, lon, placeInfo = null) => {
    toast.loading('측정소를 찾는 중...')
    setShowMapPicker(false)

    try {
      const { reverseGeocodeLatLon } = await import('../services/naverLocal')
      let baseName = placeInfo?.name || ''
      let addressLabel = placeInfo?.address || ''
      const jibunAddress = placeInfo?.jibunAddress || ''

      // 마커 드래그/지도 클릭으로 선택 시 placeInfo 없음 -> reverse geocode
      if (!placeInfo) {
        const address = await reverseGeocodeLatLon(lat, lon)
        if (address) {
          baseName = address
          addressLabel = address
        }
      }

      if (!baseName) baseName = '선택한 위치'
      if (!addressLabel) addressLabel = baseName

      const stationHint = [baseName, addressLabel, jibunAddress].filter(Boolean).join(' ')
      const stations = await findStationsWithFallback(lat, lon, stationHint)

      toast.dismiss()
      setPendingLocation({
        name: baseName,
        address: addressLabel,
        lat,
        lon,
      })
      setNearbyStations(stations)
      setStationPickerSource('map')
    } catch {
      toast.dismiss()
      toast.error('측정소 조회에 실패했습니다')
    }
  }

  /**
   * 측정소 선택 확정
   * @param {Object} station - 선택된 측정소 객체
   * @param {Object} options - { successMessage?: string }
   */
  const confirmStation = (station, options = {}) => {
    if (!pendingLocation) return

    const { successMessage } = options

    const shouldReplaceAutoDetectedAddress =
      String(pendingLocation.address || '').includes('자동 감지') &&
      String(station?.addr || '').trim()
    const resolvedAddress = shouldReplaceAutoDetectedAddress
      ? String(station.addr).trim()
      : pendingLocation.address

    updateLocation({
      ...pendingLocation,
      address: resolvedAddress,
      stationName: station.stationName,
    })

    if (successMessage) {
      toast.success(successMessage)
    } else {
      toast.success(`위치 설정 완료 (측정소: ${station.stationName})`)
    }

    setPendingLocation(null)
    setNearbyStations([])
  }

  /** 측정소 선택 취소 */
  const cancelStationPicker = () => {
    setPendingLocation(null)
    setNearbyStations([])
  }

  /** 지도 피커 열기 */
  const openMapPicker = () => setShowMapPicker(true)

  /** 지도 피커 닫기 */
  const closeMapPicker = () => setShowMapPicker(false)

  return {
    // 설정에서 가져온 현재 위치
    location,
    // 상태
    detecting,
    showMapPicker,
    pendingLocation,
    nearbyStations,
    stationPickerSource,
    // 액션
    detectCurrentLocation,
    selectFromMap,
    confirmStation,
    cancelStationPicker,
    openMapPicker,
    closeMapPicker,
  }
}
