// 수업스케치 결과 — 생성된 활동 후보 카드 (제목, 규칙, 교구, 점수) | 부모→pages/SketchPage.jsx, 스타일→css/components/cards.css
import { useState } from 'react'

/**
 * 생성형 추천 결과 카드
 * 기본은 요약형, 필요 시 상세 펼침
 */
export default function ResultCard({
  card,
  index,
  onConfirm,
  actionLabel = '✅ 이 활동으로 수업 확정',
  selected = false,
  disabled = false,
}) {
  const [expanded, setExpanded] = useState(false)

  if (!card) {
    return (
      <div className="bg-white/60 backdrop-blur-xl rounded-2xl p-lg border border-white/80 shadow-glass-strong">
        <div className="text-center py-md">
          <div className="text-4xl mb-sm">🧩</div>
          <div className="text-caption text-muted">조건을 설정하고 후보 3개 생성을 눌러주세요</div>
        </div>
      </div>
    )
  }

  const rulePreview = (card.basicRules || []).slice(0, 2)
  const equipmentPreview = (card.equipment || []).slice(0, 3)
  const extraEquipmentCount = Math.max(0, (card.equipment || []).length - equipmentPreview.length)

  const sportSkillPreview = (card.sportSkillTags || []).slice(0, 2)
  const extraSportSkillCount = Math.max(0, (card.sportSkillTags || []).length - sportSkillPreview.length)

  const fmsPreview = (card.fmsTags || []).slice(0, 2)
  const extraFmsCount = Math.max(0, (card.fmsTags || []).length - fmsPreview.length)

  return (
    <div className={`bg-white/60 backdrop-blur-xl rounded-2xl p-md border shadow-glass-strong h-full flex flex-col ${
      selected ? 'border-primary/60 ring-2 ring-primary/20' : 'border-white/80'
    }`}>
      <div className="flex items-start justify-between gap-sm mb-sm">
        <h2 className="text-body-bold flex-1 leading-snug">#{index}. {truncateText(card.title, 40)}</h2>
        <div className="text-right">
          <div className="text-[11px] text-muted">점수</div>
          <div className="text-body-bold text-primary">{card.score}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-sm">
        <Badge tone="primary">{card.sport}</Badge>
        <Badge>난이도 {card.difficulty}</Badge>
        {sportSkillPreview.map((tag) => (
          <Badge key={`${card.id}-skill-${tag}`} tone="secondary">기술 {tag}</Badge>
        ))}
        {extraSportSkillCount > 0 && <Badge>+{extraSportSkillCount}</Badge>}
        {fmsPreview.map((tag) => (
          <Badge key={`${card.id}-${tag}`}>{tag}</Badge>
        ))}
        {extraFmsCount > 0 && <Badge>+{extraFmsCount}</Badge>}
      </div>

      <div className="mb-sm">
        <div className="text-[11px] font-semibold text-muted mb-xs">핵심 규칙</div>
        <ul className="space-y-1">
          {rulePreview.map((item, itemIndex) => (
            <li key={`rule-${itemIndex}`} className="text-[12px] text-text leading-relaxed">
              • {truncateText(item, 58)}
            </li>
          ))}
        </ul>
      </div>

      <div className="text-[11px] text-muted mb-sm">
        준비물: {equipmentPreview.join(', ') || '없음'}{extraEquipmentCount > 0 ? ` +${extraEquipmentCount}` : ''}
      </div>

      <div className="flex gap-2 mb-sm">
        <button
          onClick={() => setExpanded((prev) => !prev)}
          className="py-1.5 px-2.5 rounded-md text-xs font-semibold bg-white/70 border border-white/80 hover:bg-white transition-all"
        >
          {expanded ? '상세 접기' : '상세 보기'}
        </button>
      </div>

      {expanded && (
        <div className="space-y-sm mb-sm p-sm bg-white/45 rounded-lg border border-white/70">
          <Section
            title="활동 흐름"
            items={card.compiledFlow}
            numbered
          />
          <Section
            title="적용 변형"
            items={
              card.modifierDetails ||
              (card.modifierNarratives || []).map(
                (modifier) => `${modifier.name} (${modifier.type}) - ${modifier.ruleText}`
              )
            }
          />
          {card.teacherMeaning?.length > 0 && (
            <Section title="교사 의도" items={card.teacherMeaning} />
          )}
          {card.setupExamples?.length > 0 && (
            <Section title="셋업 예시" items={card.setupExamples} />
          )}
          {card.scoringExamples?.length > 0 && (
            <Section title="점수 예시" items={card.scoringExamples} />
          )}
          <Section title="벌칙/미션" items={card.penaltiesMissions} />
          <Section title="운영 팁" items={card.operationTips} />
          <Section title="교육 효과" items={card.educationEffects} />

          {card.youtubeUrl && (
            <a
              href={card.youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-[11px] text-primary font-semibold break-all hover:underline"
            >
              영상 링크 보기
            </a>
          )}
        </div>
      )}

      <button
        onClick={() => onConfirm(card)}
        disabled={disabled}
        className={`mt-auto w-full py-2.5 px-3 rounded-lg text-sm font-semibold transition-all ${
          disabled
            ? 'bg-success/20 text-success cursor-default'
            : selected
            ? 'bg-primary/80 text-white hover:opacity-90'
            : 'bg-primary text-white hover:opacity-90'
        }`}
      >
        {disabled ? '✅ 확정 완료' : actionLabel}
      </button>
    </div>
  )
}

function Badge({ children, tone = 'default' }) {
  const className =
    tone === 'primary'
      ? 'text-[11px] px-2 py-0.5 bg-primary/10 text-primary rounded-md border border-primary/20'
      : tone === 'secondary'
      ? 'text-[11px] px-2 py-0.5 bg-secondary/25 text-text rounded-md border border-secondary/40'
      : 'text-[11px] px-2 py-0.5 bg-white/70 rounded-md border border-white/80'

  return <span className={className}>{children}</span>
}

function Section({ title, items, numbered = false }) {
  if (!items || items.length === 0) {
    return null
  }

  return (
    <div>
      <div className="text-[11px] font-semibold text-muted mb-xs">{title}</div>
      <ul className="space-y-1">
        {items.slice(0, numbered ? 6 : 3).map((item, index) => (
          <li key={`${title}-${index}`} className="text-[12px] text-text leading-relaxed">
            {numbered ? `${index + 1}. ` : '• '}{truncateText(item, 74)}
          </li>
        ))}
      </ul>
    </div>
  )
}

function truncateText(value, maxLength = 60) {
  const text = String(value || '').trim()
  if (text.length <= maxLength) {
    return text
  }
  return `${text.slice(0, maxLength)}...`
}
