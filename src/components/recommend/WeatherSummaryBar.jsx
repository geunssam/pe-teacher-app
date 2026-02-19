// 날씨 요약 바 — 상단 날씨/야외판단 요약 | 사용처→RecommendPage
import { SKY_CODE, PTY_CODE, PM_GRADE } from '../../data/mockWeather'

/**
 * 날씨 요약 + 야외수업 판단을 한 줄로 표시
 *
 * @param {{ weather: Object|null, air: Object|null, weatherContext: Object }} props
 */
export default function WeatherSummaryBar({ weather, air, weatherContext }) {
  if (!weather && !weatherContext) return null

  const skyInfo = SKY_CODE[weather?.sky] || SKY_CODE[1]
  const ptyInfo = PTY_CODE[weather?.pty] || PTY_CODE[0]
  const pm10Grade = PM_GRADE[air?.pm10Grade] || PM_GRADE[1]

  const tempText = weather?.t1h != null ? `${weather.t1h}℃` : '?℃'
  const skyText = ptyInfo.text !== '없음' ? ptyInfo.text : skyInfo.text
  const skyEmoji = ptyInfo.emoji || skyInfo.emoji

  return (
    <div
      className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border"
      style={{
        background: weatherContext?.judgment?.bg || 'rgba(255,255,255,0.5)',
        borderColor: weatherContext?.judgment?.color
          ? `${weatherContext.judgment.color}30`
          : 'rgba(255,255,255,0.6)',
      }}
    >
      {/* 왼쪽: 날씨 정보 */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-base">{skyEmoji}</span>
        <span className="font-semibold text-text">{skyText} {tempText}</span>
        <span className="text-textMuted">
          미세먼지 <span style={{ color: pm10Grade.color }}>{pm10Grade.text}</span>
        </span>
      </div>

      {/* 오른쪽: 야외 판단 */}
      {weatherContext && (
        <div
          className="flex items-center gap-1.5 text-xs font-semibold shrink-0 px-2.5 py-1 rounded-lg"
          style={{
            color: weatherContext.judgment?.color || '#059669',
            backgroundColor: weatherContext.judgment?.bg || 'transparent',
          }}
        >
          <span>{weatherContext.emoji}</span>
          <span>{weatherContext.text}</span>
        </div>
      )}
    </div>
  )
}
