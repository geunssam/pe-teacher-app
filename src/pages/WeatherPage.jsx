// 🌤️ 날씨 탭 — 날씨 상세, 대기질, 시간별 예보, 야외수업 판단, 측정소 선택 | UI→components/weather/, API→services/weather/, 위치로직→hooks/useLocationPicker.js
import { useState, useEffect, useCallback } from 'react'

import WeatherDetail from '../components/weather/WeatherDetail'
import AirQuality from '../components/weather/AirQuality'
import HourlyForecast from '../components/weather/HourlyForecast'
import StationPicker from '../components/weather/StationPicker'
import LocationMapPicker from '../components/settings/LocationMapPicker'
import { fetchWeatherData, fetchAirQualityData, fetchHourlyForecast } from '../services/weather'
import { judgeOutdoorClass } from '../data/mockWeather'
import { useLocationPicker } from '../hooks/useLocationPicker'
import toast from 'react-hot-toast'

export default function WeatherPage() {
  const {
    location,
    detecting,
    showMapPicker,
    pendingLocation,
    nearbyStations,
    stationPickerSource,
    detectCurrentLocation,
    selectFromMap,
    confirmStation,
    cancelStationPicker,
    openMapPicker,
    closeMapPicker,
  } = useLocationPicker()

  const [weather, setWeather] = useState(null)
  const [air, setAir] = useState(null)
  const [hourly, setHourly] = useState([])
  const [judgment, setJudgment] = useState(null)
  const [loading, setLoading] = useState(true)

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
            onClick={detectCurrentLocation}
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
            onClick={openMapPicker}
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
          onSelect={(station) => confirmStation(station)}
          onCancel={cancelStationPicker}
        />
      )}

      {/* 지도 위치 선택 모달 */}
      {showMapPicker && (
        <LocationMapPicker
          initialLat={location.lat}
          initialLon={location.lon}
          initialAddress={location.address || ''}
          onSelect={selectFromMap}
          onCancel={closeMapPicker}
        />
      )}
    </div>
  )
}
