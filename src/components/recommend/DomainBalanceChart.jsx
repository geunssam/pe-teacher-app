// 영역 균형 차트 — 운동/스포츠/표현 수업 분포 가로 막대 | 사용처→RecommendClassCard
const DOMAIN_COLORS = {
  '운동': '#F57C7C',
  '스포츠': '#7C9EF5',
  '표현': '#A78BFA',
}

const DOMAIN_EMOJIS = {
  '운동': '💪',
  '스포츠': '⚽',
  '표현': '🎭',
}

/**
 * 영역별 수업 분포를 가로 막대로 시각화
 *
 * @param {{ domainBalance: { 운동: number, 스포츠: number, 표현: number, suggestedDomain: string } }} props
 */
export default function DomainBalanceChart({ domainBalance }) {
  if (!domainBalance) return null

  const { suggestedDomain, ...counts } = domainBalance
  const total = (counts['운동'] || 0) + (counts['스포츠'] || 0) + (counts['표현'] || 0)
  const maxCount = Math.max(counts['운동'] || 0, counts['스포츠'] || 0, counts['표현'] || 0, 1)

  return (
    <div className="space-y-1.5">
      {Object.entries(counts).map(([domain, count]) => {
        const isSuggested = domain === suggestedDomain
        const pct = maxCount > 0 ? (count / maxCount) * 100 : 0

        return (
          <div key={domain} className="flex items-center gap-2">
            <span className="text-xs w-[52px] shrink-0 flex items-center gap-1">
              <span className="text-[10px]">{DOMAIN_EMOJIS[domain]}</span>
              <span className={`font-medium ${isSuggested ? 'font-bold' : ''}`} style={{ color: DOMAIN_COLORS[domain] }}>
                {domain}
              </span>
            </span>
            <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.max(pct, 4)}%`,
                  backgroundColor: DOMAIN_COLORS[domain],
                  opacity: isSuggested ? 0.5 : 0.8,
                }}
              />
            </div>
            <span className={`text-xs w-6 text-right ${isSuggested ? 'font-bold' : 'text-textMuted'}`}>
              {count}
            </span>
          </div>
        )
      })}
      {total > 0 && suggestedDomain && (
        <p className="text-[10px] text-textMuted mt-1">
          {suggestedDomain} 영역이 부족합니다
        </p>
      )}
    </div>
  )
}
