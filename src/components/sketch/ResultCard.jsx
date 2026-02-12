/**
 * 추천 결과 카드
 * 활동명, 설명, 메타 정보, 준비물 등 표시
 */
export default function ResultCard({ activity, onDecide, onReroll }) {
  if (!activity) {
    return (
      <div className="bg-white/60 backdrop-blur-xl rounded-2xl p-xl border border-white/80 shadow-glass-strong">
        <div className="text-center py-lg">
          <div className="text-5xl mb-md">🎲</div>
          <div className="text-body text-muted">
            필터를 설정하고 추천받기 버튼을 눌러주세요
          </div>
        </div>
      </div>
    )
  }

  // 영역별 색상
  const domainColors = {
    운동: { bg: 'rgba(245, 124, 124, 0.1)', text: '#F57C7C' },
    스포츠: { bg: 'rgba(124, 158, 245, 0.1)', text: '#7C9EF5' },
    표현: { bg: 'rgba(167, 139, 250, 0.1)', text: '#A78BFA' }
  }
  const color = domainColors[activity.domain] || domainColors['스포츠']

  // 난이도 별
  const stars = '⭐'.repeat(activity.difficulty)

  return (
    <div className="bg-white/60 backdrop-blur-xl rounded-2xl p-xl border border-white/80 shadow-glass-strong">
      {/* 활동명 + 영역 태그 */}
      <div className="mb-lg">
        <div className="flex items-start justify-between gap-md mb-sm">
          <h2 className="text-card-title flex-1">{activity.name}</h2>
          <div
            className="text-caption font-semibold px-3 py-1 rounded-lg"
            style={{ backgroundColor: color.bg, color: color.text }}
          >
            {activity.domain} · {activity.sub}
          </div>
        </div>
      </div>

      {/* 설명 */}
      <p className="text-body text-text leading-relaxed mb-lg">{activity.desc}</p>

      {/* 메타 정보 */}
      <div className="grid grid-cols-2 gap-md mb-lg">
        <div className="bg-white/40 rounded-lg p-md border border-white/60">
          <div className="text-caption text-muted mb-xs">소요시간</div>
          <div className="text-body-bold text-text">{activity.duration}분</div>
        </div>
        <div className="bg-white/40 rounded-lg p-md border border-white/60">
          <div className="text-caption text-muted mb-xs">난이도</div>
          <div className="text-body-bold text-text">{stars}</div>
        </div>
        <div className="bg-white/40 rounded-lg p-md border border-white/60">
          <div className="text-caption text-muted mb-xs">대상학년</div>
          <div className="text-caption text-text">
            {activity.grades.join(', ')}
          </div>
        </div>
        <div className="bg-white/40 rounded-lg p-md border border-white/60">
          <div className="text-caption text-muted mb-xs">장소</div>
          <div className="text-caption text-text">
            {activity.indoor && activity.outdoor
              ? '실내·외'
              : activity.indoor
              ? '실내'
              : '야외'}
          </div>
        </div>
      </div>

      {/* 준비물 */}
      {activity.equipment && activity.equipment.length > 0 && (
        <div className="mb-lg">
          <div className="text-body font-semibold text-text mb-sm">🎒 준비물</div>
          <div className="flex flex-wrap gap-2">
            {activity.equipment.map((item, index) => (
              <span
                key={index}
                className="text-caption px-3 py-1 bg-white/60 rounded-lg border border-white/80"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 액션 버튼 */}
      <div className="flex gap-md">
        <button
          onClick={onReroll}
          className="flex-1 py-3 px-4 bg-white/60 text-text rounded-xl font-semibold hover:bg-white/80 transition-all border border-white/80"
        >
          🔄 다시 추천
        </button>
        <button
          onClick={() => onDecide(activity)}
          className="flex-1 py-3 px-4 bg-primary text-white rounded-xl font-semibold hover:opacity-90 transition-all"
        >
          ✅ 수업 결정
        </button>
      </div>
    </div>
  )
}
