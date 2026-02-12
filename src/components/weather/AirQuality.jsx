import { PM_GRADE } from '../../data/mockWeather'

/**
 * 대기질 정보 카드
 */
export default function AirQuality({ air }) {
  if (!air) return null

  const pm10Info = PM_GRADE[air.pm10Grade] || PM_GRADE[1]
  const pm25Info = PM_GRADE[air.pm25Grade] || PM_GRADE[1]

  const uvLabels = ['낮음', '보통', '높음', '매우높음', '위험']
  const uvLabel = uvLabels[air.uvGrade - 1] || '보통'
  const uvColor = air.uvGrade >= 4 ? '#F57C7C' : air.uvGrade >= 3 ? '#F5A67C' : '#7CE0A3'

  return (
    <div className="bg-white/60 backdrop-blur-xl rounded-2xl p-xl border border-white/80 shadow-glass-strong">
      <h3 className="text-card-title mb-md">대기질 정보</h3>

      {/* PM10 */}
      <div
        className="rounded-xl p-md mb-sm border border-white/60"
        style={{ backgroundColor: pm10Info.bg }}
      >
        <div className="flex items-center justify-between mb-xs">
          <span className="text-body font-semibold text-text">미세먼지 (PM10)</span>
          <span className="text-2xl">{pm10Info.emoji}</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold" style={{ color: pm10Info.color }}>
            {air.pm10Value}
          </span>
          <span className="text-caption text-muted">㎍/㎥</span>
          <span
            className="ml-auto text-body-lg font-bold"
            style={{ color: pm10Info.color }}
          >
            {pm10Info.text}
          </span>
        </div>
      </div>

      {/* PM2.5 */}
      <div
        className="rounded-xl p-md mb-sm border border-white/60"
        style={{ backgroundColor: pm25Info.bg }}
      >
        <div className="flex items-center justify-between mb-xs">
          <span className="text-body font-semibold text-text">초미세먼지 (PM2.5)</span>
          <span className="text-2xl">{pm25Info.emoji}</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold" style={{ color: pm25Info.color }}>
            {air.pm25Value}
          </span>
          <span className="text-caption text-muted">㎍/㎥</span>
          <span
            className="ml-auto text-body-lg font-bold"
            style={{ color: pm25Info.color }}
          >
            {pm25Info.text}
          </span>
        </div>
      </div>

      {/* UV 지수 */}
      <div className="bg-white/40 rounded-xl p-md border border-white/60">
        <div className="flex items-center justify-between mb-xs">
          <span className="text-body font-semibold text-text">자외선 지수</span>
          <span className="text-2xl">☀️</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold" style={{ color: uvColor }}>
            {air.uvIndex}
          </span>
          <span className="text-caption text-muted">/ 11+</span>
          <span className="ml-auto text-body-lg font-bold" style={{ color: uvColor }}>
            {uvLabel}
          </span>
        </div>
      </div>

      {/* 측정소 정보 */}
      <div className="text-caption text-textMuted text-center mt-md">
        측정소: {air.stationName}
      </div>
    </div>
  )
}
