// 날씨 미니위젯 — 홈 탭 상단의 현재 날씨 요약 카드 | 부모→pages/HomePage.jsx, API→services/weather/weatherFetch.js, 위치→hooks/useSettings.js
import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { fetchWeatherData, fetchAirQualityData } from '../../services/weather'
import { judgeOutdoorClass } from '../../data/mockWeather'
import { useSettings } from '../../hooks/useSettings'

/**
 * 홈 탭의 날씨 미니 위젯
 * 한 줄 요약: 하늘상태 + 기온 + 미세먼지 + 야외 판정
 */
export default function WeatherMiniWidget() {
  const { location } = useSettings()
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadWeatherSummary = useCallback(async () => {
    try {
      const weather = await fetchWeatherData(location)
      const air = await fetchAirQualityData(location.stationName || '대전')
      const judgment = judgeOutdoorClass(weather, air)

      setSummary({
        temp: weather.t1h,
        sky: weather.sky,
        pty: weather.pty,
        pm10: air.pm10Value,
        pm10Grade: air.pm10Grade,
        judgment
      })
      setLoading(false)
    } catch (error) {
      console.error('날씨 요약 로드 실패:', error)
      setLoading(false)
    }
  }, [location.lat, location.lon, location.stationName])

  useEffect(() => {
    loadWeatherSummary()

    // 1시간마다 자동 갱신
    const interval = setInterval(() => {
      loadWeatherSummary()
    }, 60 * 60 * 1000)

    return () => clearInterval(interval)
  }, [loadWeatherSummary])

  if (loading) {
    return (
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-card-title mb-sm">오늘의 날씨</h2>
          <p className="text-body text-muted">날씨 정보 로딩 중...</p>
        </div>
        <Link to="/weather" className="btn btn-sm btn-ghost">
          상세보기 →
        </Link>
      </div>
    )
  }

  const { temp, judgment } = summary
  const statusEmoji = judgment.emoji
  const statusText = judgment.text
  const statusColor = judgment.color

  return (
    <div>
      <div className="flex items-center justify-between mb-md">
        <h2 className="text-card-title">오늘의 날씨</h2>
        <Link to="/weather" className="btn btn-sm btn-ghost">
          상세보기 →
        </Link>
      </div>

      {/* 날씨 요약 */}
      <div className="flex items-center gap-md">
        <div className="text-5xl">{statusEmoji}</div>
        <div className="flex-1">
          <div className="text-3xl font-black text-text mb-xs">{temp}°</div>
          <div className="text-body font-semibold" style={{ color: statusColor }}>
            {statusText}
          </div>
        </div>
      </div>

      {/* 간단 정보 */}
      <div className="mt-md pt-md border-t border-white/40">
        <div className="flex items-center justify-between text-caption">
          <span className="text-muted">기온</span>
          <span className="font-semibold text-text">{temp}℃</span>
        </div>
        <div className="flex items-center justify-between text-caption mt-xs">
          <span className="text-muted">미세먼지</span>
          <span className="font-semibold text-text">{summary.pm10}㎍/㎥</span>
        </div>
      </div>
    </div>
  )
}
