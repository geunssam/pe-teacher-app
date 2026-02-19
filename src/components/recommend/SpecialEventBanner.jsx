// 특별행사 배너 — 운동회/대피훈련 등 감지 시 맞춤 메시지 표시 | 사용처→RecommendClassCard
/**
 * 특별 행사 감지 시 배너 표시
 *
 * @param {{ type: 'skip'|'adjust'|'special', message: string, period: number, classInfo: Object }} props
 */
export default function SpecialEventBanner({ type = 'skip', message, period, classInfo }) {
  const configs = {
    skip: {
      emoji: '📢',
      bg: 'bg-warning/10',
      border: 'border-warning/30',
      textColor: '#D97706',
    },
    adjust: {
      emoji: '⚠️',
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      textColor: '#EA580C',
    },
    special: {
      emoji: '🎯',
      bg: 'bg-primary/5',
      border: 'border-primary/20',
      textColor: '#7C9EF5',
    },
  }

  const config = configs[type] || configs.skip
  const classLabel = classInfo
    ? `${classInfo.grade} ${classInfo.classNum}반`
    : ''

  return (
    <div className={`flex items-start gap-2.5 px-4 py-3 rounded-xl ${config.bg} border ${config.border}`}>
      <span className="text-lg mt-0.5">{config.emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-textMuted mb-0.5">
          {period}교시 {classLabel}
        </div>
        <p className="text-sm font-semibold leading-snug" style={{ color: config.textColor }}>
          {message}
        </p>
      </div>
    </div>
  )
}
