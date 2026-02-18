// ACE 배지 — A(활동/파랑), C(경쟁/오렌지), E(평가/보라) | 색상→CLAUDE.md 디자인 시스템
const ACE_CONFIG = {
  A: { label: 'A \u00B7 활동', bg: 'bg-[#7C9EF5]', text: 'text-white' },
  C: { label: 'C \u00B7 경쟁', bg: 'bg-[#F5A67C]', text: 'text-white' },
  E: { label: 'E \u00B7 평가', bg: 'bg-[#A78BFA]', text: 'text-white' },
}

export default function AceBadge({ phase, size = 'sm' }) {
  const config = ACE_CONFIG[phase]
  if (!config) return null

  const sizeClass = size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1'

  return (
    <span className={`inline-flex items-center rounded-full font-semibold whitespace-nowrap ${config.bg} ${config.text} ${sizeClass}`}>
      {config.label}
    </span>
  )
}
