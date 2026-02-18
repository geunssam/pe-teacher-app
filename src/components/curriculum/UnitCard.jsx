// 단원 카드 — 단원 제목, 영역, 학년, 차시수, ACE 배분, 성취기준 표시 | GlassCard→common/GlassCard.jsx
import GlassCard from '../common/GlassCard'
import AceBadge from './AceBadge'

const DOMAIN_COLORS = {
  '운동': { bg: 'bg-[#F57C7C]', text: 'text-white' },
  '스포츠': { bg: 'bg-[#7C9EF5]', text: 'text-white' },
  '표현': { bg: 'bg-[#A78BFA]', text: 'text-white' },
}

export default function UnitCard({ unit, onClick }) {
  const { title, grade, domain, totalLessons, aceDistribution, standardCodes } = unit
  const domainColor = DOMAIN_COLORS[domain] || { bg: 'bg-gray-200', text: 'text-gray-700' }

  return (
    <GlassCard
      clickable
      onClick={onClick}
      className="p-5 transition-transform duration-150 hover:-translate-y-0.5 cursor-pointer"
    >
      {/* 상단: 영역 배지 + 학년 */}
      <div className="flex items-center gap-2 mb-3">
        <span className={`inline-flex items-center rounded-full text-[11px] font-semibold px-2.5 py-0.5 ${domainColor.bg} ${domainColor.text}`}>
          {domain}
        </span>
        <span className="text-xs font-bold text-gray-900">{grade}</span>
      </div>

      {/* 제목 */}
      <h3 className="text-base font-bold text-gray-900 mb-3 leading-snug">{title}</h3>

      {/* ACE 배분 */}
      <div className="flex items-center gap-3 mb-3 text-xs text-gray-500 whitespace-nowrap">
        <span>총 {totalLessons}차시</span>
        <span className="text-gray-300">|</span>
        <div className="flex items-center gap-1.5">
          <AceBadge phase="A" />
          <span>{aceDistribution.A.lessons.length}</span>
          <AceBadge phase="C" />
          <span>{aceDistribution.C.lessons.length}</span>
          <AceBadge phase="E" />
          <span>{aceDistribution.E.lessons.length}</span>
        </div>
      </div>

      {/* 성취기준 코드 */}
      <div className="flex flex-wrap gap-1">
        {standardCodes.map((code) => (
          <span key={code} className="text-[10px] text-gray-400 bg-gray-100 rounded px-1.5 py-0.5">
            {code}
          </span>
        ))}
      </div>
    </GlassCard>
  )
}
