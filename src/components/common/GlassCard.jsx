// 공통 카드 — 글래스모피즘 스타일의 카드 컨테이너 | 스타일→css/components/cards.css, 글래스→css/utilities/glass.css
/**
 * 리퀴드 글래스 이펙트 카드 컴포넌트
 *
 * @param {string} className - 추가 CSS 클래스
 * @param {boolean} strong - 강한 글래스 효과 여부
 * @param {boolean} clickable - 클릭 가능 여부
 * @param {string} accent - 상단 강조 색상 (home|weather|schedule|sketch|classes)
 * @param {function} onClick - 클릭 핸들러
 * @param {ReactNode} children - 자식 요소
 */
export default function GlassCard({
  className = '',
  strong = false,
  clickable = false,
  accent = null,
  onClick = null,
  children,
}) {
  const baseClass = strong ? 'glass-card-strong' : 'glass-card'
  const clickClass = clickable || onClick ? 'glass-card-clickable' : ''
  const accentClass = accent ? `card-accent-${accent}` : ''

  return (
    <div
      className={`${baseClass} ${clickClass} ${accentClass} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  )
}
