import { useState, useEffect, useCallback } from 'react'

import WeatherDetail from '../components/weather/WeatherDetail'
import AirQuality from '../components/weather/AirQuality'
import HourlyForecast from '../components/weather/HourlyForecast'
import StationPicker from '../components/weather/StationPicker'
import LocationMapPicker from '../components/settings/LocationMapPicker'
import { fetchWeatherData, fetchAirQualityData, fetchHourlyForecast } from '../services/weatherApi'
import { findStationsWithFallback } from '../utils/stationFinder'
import { reverseGeocodeLatLon } from '../services/naverLocal'
import { judgeOutdoorClass } from '../data/mockWeather'
import { useSettings } from '../hooks/useSettings'
import toast from 'react-hot-toast'

export default function WeatherPage() {
  const { location, updateLocation } = useSettings()
  const [weather, setWeather] = useState(null)
  const [air, setAir] = useState(null)
  const [hourly, setHourly] = useState([])
  const [judgment, setJudgment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [detecting, setDetecting] = useState(false)
  const [showMapPicker, setShowMapPicker] = useState(false)
  const [pendingLocation, setPendingLocation] = useState(null)
  const [nearbyStations, setNearbyStations] = useState([])
  const [stationPickerSource, setStationPickerSource] = useState('gps')

  const handleCurrentLocation = () => {
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
          const address = await reverseGeocodeLatLon(lat, lon)
          const stations = await findStationsWithFallback(lat, lon, address || '')
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

  const handleMapSelect = async (lat, lon, placeInfo = null) => {
    toast.loading('측정소를 찾는 중...')
    setShowMapPicker(false)

    try {
      let baseName = placeInfo?.name || ''
      let addressLabel = placeInfo?.address || ''
      let jibunAddress = placeInfo?.jibunAddress || ''

      // 마커 드래그/지도 클릭으로 선택 시 placeInfo 없음 → reverse geocode
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

  const handleStationSelect = (station) => {
    if (!pendingLocation) return

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
    toast.success(`위치 설정 완료 (측정소: ${station.stationName})`)
    setPendingLocation(null)
    setNearbyStations([])
  }

  const handleStationCancel = () => {
    setPendingLocation(null)
    setNearbyStations([])
  }

  const loadWeatherData = useCallback(async (silent = false) => {
    setLoading(true)

    try {
      const weatherData = await fetchWeatherData(location)
      const airData = await fetchAirQualityData(location.stationName)
      const hourlyResult = await fetchHourlyForecast(location)
      const hourlyData = Array.isArray(hourlyResult)
        ? hourlyResult
        : hourlyResult?.forecast || []
      const normalizedHourly = hourlyData.map((item) => ({
        ...item,
        time: `${String(item.time).slice(0, 2)}시`,
      }))
      const judgmentData = judgeOutdoorClass(weatherData, airData)

      setWeather(weatherData)
      setAir(airData)
      setHourly(normalizedHourly)
      setJudgment(judgmentData)
      if (!silent) {
        toast.success('날씨 정보를 업데이트했습니다')
      }
    } catch (error) {
      console.error('날씨 데이터 로드 실패:', error)
      if (!silent) {
        toast.error('날씨 정보를 불러오는데 실패했습니다')
      }
    } finally {
      setLoading(false)
    }
  }, [location.lat, location.lon, location.stationName])

  useEffect(() => {
    loadWeatherData(true)

    const interval = setInterval(() => {
      loadWeatherData(true)
    }, 60 * 60 * 1000)

    return () => clearInterval(interval)
  }, [loadWeatherData])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-4xl mb-md">🌤️</div>
          <div className="text-body text-muted">날씨 정보를 불러오는 중...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-md py-lg max-w-2xl">
      {/* 헤더: 타이틀 + 학교정보 + 새로고침 */}
      <div className="flex items-center justify-between mb-lg">
        <h1 className="text-page-title shrink-0">🌤️ 날씨</h1>
        <div className="flex items-center gap-2">
          {location.address ? (
            <span className="text-caption text-textMuted truncate max-w-[240px]">
              📍 {location.address} · 🌫️ {location.stationName} 기준
            </span>
          ) : (
            <span className="text-caption text-textMuted">
              📍 위치 설정
            </span>
          )}
          {weather && (
            <span className="text-caption text-textMuted">
              🕐 {weather.baseTime.slice(0, 2)}:{weather.baseTime.slice(2, 4)}
            </span>
          )}
          <button
            onClick={() => loadWeatherData(false)}
            className="p-2 bg-white/60 hover:bg-white/80 rounded-lg transition-all border border-white/80 shrink-0"
            title="새로고침"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
          </button>
          <button
            onClick={handleCurrentLocation}
            disabled={detecting}
            className="p-2 bg-white/60 hover:bg-white/80 rounded-lg transition-all border border-white/80 shrink-0 disabled:opacity-50"
            title="현재 위치로 설정"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
          </button>
          <button
            onClick={() => setShowMapPicker(true)}
            className="p-2 bg-white/60 hover:bg-white/80 rounded-lg transition-all border border-white/80 shrink-0"
            title="지도에서 위치 선택"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon>
              <line x1="8" y1="2" x2="8" y2="18"></line>
              <line x1="16" y1="6" x2="16" y2="22"></line>
            </svg>
          </button>
        </div>
      </div>

      {/* 컨텐츠: 기상 종합 → 시간별 → 대기질 상세 */}
      <div className="space-y-lg">
        <WeatherDetail weather={weather} air={air} judgment={judgment} />
        <HourlyForecast forecast={hourly} />
        <AirQuality air={air} />
      </div>

      {/* 측정소 선택 모달 */}
      {pendingLocation && nearbyStations.length > 0 && (
        <StationPicker
          locationName={pendingLocation.address || pendingLocation.name}
          source={stationPickerSource}
          stations={nearbyStations}
          centerLat={pendingLocation.lat}
          centerLon={pendingLocation.lon}
          onSelect={handleStationSelect}
          onCancel={handleStationCancel}
        />
      )}

      {/* 지도 위치 선택 모달 */}
      {showMapPicker && (
        <LocationMapPicker
          initialLat={location.lat}
          initialLon={location.lon}
          initialAddress={location.address || ''}
          onSelect={handleMapSelect}
          onCancel={() => setShowMapPicker(false)}
        />
      )}
    </div>
  )
}
