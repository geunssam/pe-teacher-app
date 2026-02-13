import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import WeatherDetail from '../components/weather/WeatherDetail'
import AirQuality from '../components/weather/AirQuality'
import HourlyForecast from '../components/weather/HourlyForecast'
import { fetchWeatherData, fetchAirQualityData, fetchHourlyForecast } from '../services/weatherApi'
import { judgeOutdoorClass } from '../data/mockWeather'
import { useSettings } from '../hooks/useSettings'
import toast from 'react-hot-toast'

export default function WeatherPage() {
  const { location } = useSettings()
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
            <span className="text-caption text-text-muted truncate max-w-[200px]">
              {location.name} · {location.stationName}
            </span>
          ) : (
            <Link to="/settings" className="text-caption text-primary underline">
              위치 설정
            </Link>
          )}
          {weather && (
            <span className="text-caption text-text-muted">
              {weather.baseTime.slice(0, 2)}:{weather.baseTime.slice(2, 4)}
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
        </div>
      </div>

      {/* 컨텐츠: 기상 종합 → 시간별 → 대기질 상세 */}
      <div className="space-y-lg">
        <WeatherDetail weather={weather} air={air} judgment={judgment} />
        <HourlyForecast forecast={hourly} />
        <AirQuality air={air} />
      </div>
    </div>
  )
}
