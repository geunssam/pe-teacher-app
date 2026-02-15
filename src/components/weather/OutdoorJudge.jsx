// 야외수업 판단 — 날씨 조건 종합하여 실외활동 가능 여부 판정 | 부모→pages/WeatherPage.jsx, 판단로직→data/mockWeather.js
/**
 * 야외수업 자동 판단 결과
 */
export default function OutdoorJudge({ judgment }) {
  if (!judgment) return null

  const { status, emoji, text, color, reason, checks } = judgment

  return (
    <div className="bg-white/60 backdrop-blur-xl rounded-2xl p-xl border border-white/80 shadow-glass-strong">
      <h3 className="text-card-title mb-md">야외수업 판단</h3>

      {/* 판정 결과 */}
      <div
        className="rounded-xl p-lg mb-lg text-center border-2"
        style={{
          backgroundColor: `${color}20`,
          borderColor: color
        }}
      >
        <div className="text-5xl mb-sm">{emoji}</div>
        <div className="text-card-title font-bold mb-xs" style={{ color }}>
          {text}
        </div>
        {reason && (
          <div className="text-body text-muted">사유: {reason}</div>
        )}
      </div>

      {/* 체크리스트 */}
      <div className="space-y-sm">
        <div className="text-body font-semibold text-text mb-xs">상세 체크</div>

        {Object.entries(checks).map(([key, check]) => {
          if (key === 'pm10Warning' && check.pass) return null // 통과면 표시 안 함

          const checkEmoji = check.pass ? '✅' : '❌'
          const checkColor = check.pass ? '#059669' : '#DC2626'

          return (
            <div
              key={key}
              className="flex items-center justify-between p-md bg-white/40 rounded-lg border border-white/60"
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{checkEmoji}</span>
                <span className="text-body font-semibold text-text">{check.label}</span>
              </div>
              <span className="text-body font-semibold" style={{ color: checkColor }}>
                {check.value}
              </span>
            </div>
          )
        })}
      </div>

      {/* 권장사항 */}
      <div className="mt-lg p-md bg-white/40 rounded-lg border border-white/60">
        <div className="text-body font-semibold text-text mb-xs">💡 권장사항</div>
        <div className="text-body text-muted leading-relaxed">
          {status === 'optimal' && '야외 수업하기 좋은 날씨입니다!'}
          {status === 'caution' &&
            '야외 수업은 가능하지만, 학생들에게 마스크 착용을 권장하세요.'}
          {status === 'not-recommended' &&
            '실내 수업으로 전환하거나, 체육관 사용을 권장합니다.'}
        </div>
      </div>
    </div>
  )
}
