/**
 * 생성형 추천 결과 카드
 * 템플릿 구조: 제목/규칙/미션/팁/효과/링크/준비물
 */
export default function ResultCard({
  card,
  index,
  onConfirm,
  actionLabel = '✅ 이 활동으로 수업 확정',
  selected = false,
  disabled = false,
}) {
  if (!card) {
    return (
      <div className="bg-white/60 backdrop-blur-xl rounded-2xl p-xl border border-white/80 shadow-glass-strong">
        <div className="text-center py-lg">
          <div className="text-5xl mb-md">🧩</div>
          <div className="text-body text-muted">조건을 설정하고 후보 3개 생성을 눌러주세요</div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white/60 backdrop-blur-xl rounded-2xl p-xl border shadow-glass-strong ${
      selected ? 'border-primary/60 ring-2 ring-primary/20' : 'border-white/80'
    }`}>
      <div className="flex items-start justify-between gap-md mb-md">
        <h2 className="text-card-title flex-1">
          #{index}. {card.title}
        </h2>
        <div className="text-right">
          <div className="text-caption text-muted">추천 점수</div>
          <div className="text-body-bold text-primary">{card.score}점</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-md">
        <span className="text-caption px-3 py-1 bg-primary/10 text-primary rounded-lg border border-primary/20">
          {card.sport}
        </span>
        <span className="text-caption px-3 py-1 bg-white/60 rounded-lg border border-white/80">
          난이도 {card.difficulty}
        </span>
        {card.sportSkillTags?.map((tag) => (
          <span
            key={`${card.id}-skill-${tag}`}
            className="text-caption px-3 py-1 bg-secondary/25 text-text rounded-lg border border-secondary/40"
          >
            기술 {tag}
          </span>
        ))}
        {card.fmsTags?.map((tag) => (
          <span
            key={`${card.id}-${tag}`}
            className="text-caption px-3 py-1 bg-white/60 rounded-lg border border-white/80"
          >
            {tag}
          </span>
        ))}
      </div>

      <Section title="기본 규칙" items={card.basicRules} />
      <Section title="벌칙/미션" items={card.penaltiesMissions} />
      <Section title="운영 팁/변형" items={card.operationTips} />
      <Section title="교육적 효과" items={card.educationEffects} />

      <div className="mb-md">
        <div className="text-body font-semibold text-text mb-sm">유튜브 링크</div>
        <a
          href={card.youtubeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-caption text-primary font-semibold break-all hover:underline"
        >
          {card.youtubeUrl}
        </a>
      </div>

      <div className="mb-lg">
        <div className="text-body font-semibold text-text mb-sm">교구/준비물</div>
        <div className="flex flex-wrap gap-2">
          {card.equipment?.map((item) => (
            <span
              key={`${card.id}-${item}`}
              className="text-caption px-3 py-1 bg-white/60 rounded-lg border border-white/80"
            >
              {item}
            </span>
          ))}
        </div>
      </div>

      <div className="p-md bg-white/40 rounded-lg border border-white/60 mb-lg">
        <div className="text-caption text-muted mb-xs">추천 설명</div>
        <div className="text-caption text-text">{card.explanation}</div>
      </div>

      <button
        onClick={() => onConfirm(card)}
        disabled={disabled}
        className={`w-full py-3 px-4 rounded-xl font-semibold transition-all ${
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

function Section({ title, items }) {
  if (!items || items.length === 0) {
    return null
  }

  return (
    <div className="mb-md">
      <div className="text-body font-semibold text-text mb-sm">{title}</div>
      <ul className="space-y-xs">
        {items.map((item, index) => (
          <li key={`${title}-${index}`} className="text-caption text-text leading-relaxed">
            • {item}
          </li>
        ))}
      </ul>
    </div>
  )
}
