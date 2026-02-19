// 💡 수업 추천 — 날씨+기록+시간표+교육과정 종합 학급별 맞춤 수업 추천 | 훅→useLessonRecommend, 날씨→services/weather
import { useState, useEffect, useMemo } from 'react'
import { useLessonRecommend } from '../hooks/useLessonRecommend'
import { useCurrentPeriod } from '../hooks/useCurrentPeriod'
import { useSettings } from '../hooks/useSettings'
import { fetchWeatherData, fetchAirQualityData } from '../services/weather'
import WeatherSummaryBar from '../components/recommend/WeatherSummaryBar'
import RecommendClassCard from '../components/recommend/RecommendClassCard'
import WeeklyRecommendGrid from '../components/recommend/WeeklyRecommendGrid'
import GlassCard from '../components/common/GlassCard'

const WEEKDAY_LABELS = { mon: '월', tue: '화', wed: '수', thu: '목', fri: '금' }

export default function RecommendPage() {
  const [viewMode, setViewMode] = useState('daily') // 'daily' | 'weekly'
  const [weather, setWeather] = useState(null)
  const [air, setAir] = useState(null)
  const { location } = useSettings()
  const { currentDay } = useCurrentPeriod()

  // 날씨 데이터 로드
  useEffect(() => {
    if (!location?.lat || !location?.lon) return

    fetchWeatherData(location)
      .then((data) => setWeather(data))
      .catch(() => {})

    if (location.stationName) {
      fetchAirQualityData(location.stationName)
        .then((data) => setAir(data))
        .catch(() => {})
    }
  }, [location])

  const {
    todayRecommendations,
    weekRecommendations,
    generateAIRecommendation,
    weatherContext,
    aiResults,
    aiLoading,
  } = useLessonRecommend({ weather, air })

  // 오늘 요일 표시
  const todayLabel = currentDay ? `${WEEKDAY_LABELS[currentDay]}요일` : '오늘'

  // 추천이 없을 때 메시지
  const hasDaily = todayRecommendations.length > 0
  const hasWeekly = useMemo(() => {
    if (!weekRecommendations) return false
    return Object.values(weekRecommendations).some((recs) => recs.length > 0)
  }, [weekRecommendations])

  return (
    <div className="page-container">
      {/* 페이지 타이틀 + 뷰 토글 */}
      <div className="flex items-center justify-between mb-lg">
        <h1 className="text-page-title">수업 추천</h1>
        <div className="flex items-center gap-1 bg-white/40 rounded-xl p-1 border border-white/60">
          <button
            onClick={() => setViewMode('daily')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'daily'
                ? 'bg-white/80 text-text shadow-sm'
                : 'text-textMuted hover:text-text'
            }`}
          >
            일간
          </button>
          <button
            onClick={() => setViewMode('weekly')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'weekly'
                ? 'bg-white/80 text-text shadow-sm'
                : 'text-textMuted hover:text-text'
            }`}
          >
            주간
          </button>
        </div>
      </div>

      {/* 날씨 요약 바 */}
      <div className="mb-4">
        <WeatherSummaryBar
          weather={weather}
          air={air}
          weatherContext={weatherContext}
        />
      </div>

      {/* 일간 뷰 */}
      {viewMode === 'daily' && (
        <div className="space-y-3">
          {!currentDay && (
            <GlassCard className="text-center py-6">
              <p className="text-sm text-textMuted">주말에는 수업 추천이 제공되지 않습니다</p>
              <button
                onClick={() => setViewMode('weekly')}
                className="mt-2 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all hover:bg-white/60"
                style={{ color: '#4DD0E1' }}
              >
                주간 뷰로 보기
              </button>
            </GlassCard>
          )}

          {currentDay && !hasDaily && (
            <GlassCard className="text-center py-8">
              <div className="text-3xl mb-3">💡</div>
              <p className="text-sm font-semibold text-text mb-1">
                {todayLabel} 체육 수업이 없습니다
              </p>
              <p className="text-xs text-textMuted">
                시간표에 체육 수업을 등록하면 추천을 받을 수 있습니다
              </p>
              <button
                onClick={() => setViewMode('weekly')}
                className="mt-3 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all hover:bg-white/60"
                style={{ color: '#4DD0E1' }}
              >
                주간 뷰로 보기
              </button>
            </GlassCard>
          )}

          {currentDay && hasDaily && (
            <>
              <p className="text-xs text-textMuted mb-1">
                {todayLabel} 체육 수업 {todayRecommendations.length}개
              </p>
              {todayRecommendations.map((rec, idx) => (
                <RecommendClassCard
                  key={rec.classId + '-' + rec.period + '-' + idx}
                  data={rec}
                  onAIRecommend={generateAIRecommendation}
                  aiResult={aiResults[rec.classId] || null}
                  aiLoading={aiLoading}
                />
              ))}
            </>
          )}
        </div>
      )}

      {/* 주간 뷰 */}
      {viewMode === 'weekly' && (
        <WeeklyRecommendGrid
          weekRecommendations={weekRecommendations}
          currentDay={currentDay}
        />
      )}
    </div>
  )
}
