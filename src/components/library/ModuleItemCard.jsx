// 모듈 아이템 카드 — 타입별 다른 필드 표시 + _source 배지 | GlassCard→common/GlassCard.jsx
import GlassCard from '../common/GlassCard'

const SOURCE_BADGE = {
  edited: { label: '편집됨', className: 'bg-blue-50 text-blue-600 border-blue-200' },
  custom: { label: '직접 추가', className: 'bg-orange-50 text-orange-600 border-orange-200' },
}

const TYPE_EMOJI = {
  sports: '⚽',
  skills: '🎯',
  activities: '🏃',
  modifiers: '🔧',
}

function FieldChips({ items, color = 'bg-gray-100 text-gray-600' }) {
  if (!items?.length) return null
  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {items.slice(0, 5).map((item) => (
        <span key={item} className={`text-[10px] rounded-full px-2 py-0.5 ${color}`}>{item}</span>
      ))}
      {items.length > 5 && (
        <span className="text-[10px] text-gray-400">+{items.length - 5}</span>
      )}
    </div>
  )
}

function SportsFields({ item }) {
  return (
    <>
      <p className="text-[11px] text-gray-400 mt-1">
        {item.domain} &middot; {item.subDomain}
      </p>
      <FieldChips items={item.fmsGroup} color="bg-emerald-50 text-emerald-600" />
      <FieldChips items={item.defaultEquipment} />
    </>
  )
}

function SkillsFields({ item }) {
  return (
    <>
      <p className="text-[11px] text-gray-400 mt-1">{item.sport}</p>
      {item.teachingCues?.length > 0 && (
        <div className="mt-1.5">
          {item.teachingCues.slice(0, 2).map((cue, i) => (
            <p key={i} className="text-[11px] text-gray-500 leading-relaxed">
              <span className="text-amber-400 mr-1">&#9679;</span>{cue}
            </p>
          ))}
        </div>
      )}
      <FieldChips items={item.fms} color="bg-blue-50 text-blue-600" />
    </>
  )
}

function ActivitiesFields({ item }) {
  return (
    <>
      <p className="text-[11px] text-gray-400 mt-1">
        {item.suitablePhase} &middot; {item.space?.join(', ')}
      </p>
      {item.flow?.length > 0 && (
        <p className="text-[11px] text-gray-500 mt-1.5 leading-relaxed line-clamp-2">
          {item.flow.join(' → ')}
        </p>
      )}
    </>
  )
}

function ModifiersFields({ item }) {
  return (
    <>
      <p className="text-[11px] text-gray-400 mt-1">{item.type} &middot; {item.suitablePhase}</p>
      {item.ruleOverride && (
        <p className="text-[11px] text-gray-500 mt-1.5 leading-relaxed">{item.ruleOverride}</p>
      )}
    </>
  )
}

const FIELD_RENDERERS = {
  sports: SportsFields,
  skills: SkillsFields,
  activities: ActivitiesFields,
  modifiers: ModifiersFields,
}

export default function ModuleItemCard({ item, type, onClick }) {
  const badge = SOURCE_BADGE[item._source]
  const FieldRenderer = FIELD_RENDERERS[type]

  return (
    <GlassCard
      clickable
      onClick={() => onClick(item)}
      className="p-4 transition-transform duration-150 hover:-translate-y-0.5 cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm">{TYPE_EMOJI[type]}</span>
          <h4 className="text-sm font-bold text-gray-900 truncate">{item.name}</h4>
        </div>
        {badge && (
          <span className={`shrink-0 text-[10px] font-medium rounded-full px-2 py-0.5 border ${badge.className}`}>
            {badge.label}
          </span>
        )}
      </div>

      {FieldRenderer && <FieldRenderer item={item} />}
    </GlassCard>
  )
}
