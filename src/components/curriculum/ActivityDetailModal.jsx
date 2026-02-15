// 활동 상세 모달 — ACE 수업 흐름 지원 + 기존 simple flow 호환 + 아이디어 팁 | Modal→common/Modal.jsx
import Modal from '../common/Modal'
import AceBadge from './AceBadge'
import IdeaTipPanel from './IdeaTipPanel'

const DIFFICULTY_LABEL = { 1: '쉬움', 2: '보통', 3: '어려움' }
const DIFFICULTY_COLOR = {
  1: 'bg-emerald-50 text-emerald-600',
  2: 'bg-amber-50 text-amber-600',
  3: 'bg-red-50 text-red-600',
}

function SectionTitle({ children }) {
  return <h4 className="text-xs font-bold text-gray-700 mb-1.5 mt-4 first:mt-0">{children}</h4>
}

// ACE 단계별 색상·아이콘 설정
const PHASE_CONFIG = {
  intro:     { label: '도입',       color: 'border-gray-300',   bg: 'bg-gray-50',    dot: 'bg-gray-400',   icon: '🎯' },
  acquire:   { label: 'Acquire',    color: 'border-blue-300',   bg: 'bg-blue-50',    dot: 'bg-[#7C9EF5]',  icon: '📘' },
  challenge: { label: 'Challenge',  color: 'border-orange-300', bg: 'bg-orange-50',  dot: 'bg-[#F5A67C]',  icon: '🔥' },
  engage:    { label: 'Engage',     color: 'border-purple-300', bg: 'bg-purple-50',  dot: 'bg-[#A78BFA]',  icon: '🏆' },
  wrapup:    { label: '마무리',     color: 'border-gray-300',   bg: 'bg-gray-50',    dot: 'bg-gray-400',   icon: '💬' },
}

function MetaQuestionBox({ question }) {
  if (!question) return null
  return (
    <div className="mt-2 p-2.5 bg-amber-50/80 border border-amber-200/60 rounded-xl">
      <p className="text-[11px] font-semibold text-amber-700 mb-0.5">메타인지 발문</p>
      <p className="text-xs text-amber-800 leading-relaxed italic">&ldquo;{question}&rdquo;</p>
    </div>
  )
}

function FeedbackList({ items }) {
  if (!items?.length) return null
  return (
    <div className="mt-2 space-y-1">
      <p className="text-[11px] font-semibold text-gray-500">피드백 포인트</p>
      {items.map((fb, i) => (
        <p key={i} className="text-[11px] text-gray-500 leading-relaxed pl-3 relative before:content-['💡'] before:absolute before:left-0 before:text-[10px]">
          {fb}
        </p>
      ))}
    </div>
  )
}

function ScaffoldingTip({ scaffolding }) {
  if (!scaffolding) return null
  return (
    <div className="mt-1.5 flex flex-col gap-1">
      {scaffolding.down && (
        <div className="flex gap-1.5 items-start">
          <span className="flex-shrink-0 w-4 h-4 rounded bg-sky-100 text-sky-500 text-[10px] font-bold flex items-center justify-center">&#8595;</span>
          <p className="text-[10px] text-sky-600 leading-relaxed">{scaffolding.down}</p>
        </div>
      )}
      {scaffolding.up && (
        <div className="flex gap-1.5 items-start">
          <span className="flex-shrink-0 w-4 h-4 rounded bg-rose-100 text-rose-500 text-[10px] font-bold flex items-center justify-center">&#8593;</span>
          <p className="text-[10px] text-rose-600 leading-relaxed">{scaffolding.up}</p>
        </div>
      )}
    </div>
  )
}

function PhaseBlock({ phase, data }) {
  const config = PHASE_CONFIG[phase]
  if (!config || !data) return null

  return (
    <div className={`relative pl-7 pb-4 last:pb-0`}>
      {/* 타임라인 도트 */}
      <div className={`absolute left-0 top-0.5 w-5 h-5 rounded-full ${config.dot} flex items-center justify-center text-[10px]`}>
        <span className="text-white font-bold" style={{ fontSize: '10px', lineHeight: 1 }}>
          {config.icon}
        </span>
      </div>

      {/* 헤더 */}
      <div className="flex items-center gap-2 mb-1.5">
        <span className={`text-xs font-bold ${phase === 'acquire' ? 'text-[#7C9EF5]' : phase === 'challenge' ? 'text-[#F5A67C]' : phase === 'engage' ? 'text-[#A78BFA]' : 'text-gray-600'}`}>
          {config.label}
        </span>
        {data.minutes && (
          <span className="text-[10px] text-gray-400">{data.minutes}분</span>
        )}
      </div>

      {/* 목표 */}
      {data.goal && (
        <p className="text-[11px] text-gray-500 mb-2 leading-relaxed">{data.goal}</p>
      )}

      {/* 도입/마무리: flow 목록 */}
      {data.flow?.length > 0 && (
        <ul className="space-y-0.5">
          {data.flow.map((item, i) => (
            <li key={i} className="text-xs text-gray-600 leading-relaxed flex gap-1.5">
              <span className="text-gray-300 flex-shrink-0">&#8226;</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Acquire: 드릴 목록 */}
      {data.drills?.length > 0 && (
        <div className="space-y-2">
          {data.drills.map((drill, i) => (
            <div key={i} className={`p-2 rounded-lg ${config.bg}`}>
              <p className="text-xs font-semibold text-gray-700">{drill.name}</p>
              <p className="text-[11px] text-gray-500 leading-relaxed">{drill.description}</p>
              <ScaffoldingTip scaffolding={drill.scaffolding} />
            </div>
          ))}
        </div>
      )}

      {/* Challenge: 미션 목록 */}
      {data.missions?.length > 0 && (
        <div className="space-y-2">
          {data.missions.map((mission, i) => (
            <div key={i} className={`p-2 rounded-lg ${config.bg}`}>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-700">미션 {i + 1}: {mission.name}</span>
                {mission.minutes && <span className="text-[10px] text-gray-400">{mission.minutes}분</span>}
              </div>
              <p className="text-[11px] text-gray-500 leading-relaxed mt-0.5">{mission.description}</p>
              <ScaffoldingTip scaffolding={mission.scaffolding} />
            </div>
          ))}
        </div>
      )}

      {/* Engage: 게임 상세 */}
      {data.game && (
        <div className={`p-2.5 rounded-lg ${config.bg}`}>
          <p className="text-xs font-semibold text-gray-700 mb-1">{data.game.name}</p>
          <p className="text-[11px] text-gray-500 leading-relaxed mb-1.5">{data.game.description}</p>
          {data.game.rules?.length > 0 && (
            <ul className="space-y-0.5">
              {data.game.rules.map((rule, i) => (
                <li key={i} className="text-[11px] text-gray-600 leading-relaxed flex gap-1.5">
                  <span className="text-purple-300 flex-shrink-0">▸</span>
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          )}
          <ScaffoldingTip scaffolding={data.game.scaffolding} />
          {data.variation && (
            <p className="text-[11px] text-purple-500 mt-1.5 font-medium">변형: {data.variation}</p>
          )}
        </div>
      )}

      {/* 마무리: 다음 차시 예고 + 안전 */}
      {data.nextPreview && (
        <p className="text-[11px] text-blue-500 mt-1.5">다음 차시: {data.nextPreview}</p>
      )}
      {data.safetyNote && (
        <p className="text-[11px] text-red-400 mt-1">안전: {data.safetyNote}</p>
      )}

      {/* 메타인지 발문 */}
      <MetaQuestionBox question={data.metaQuestion} />

      {/* 피드백 */}
      <FeedbackList items={data.feedback} />
    </div>
  )
}

// ACE 수업 흐름 전체 렌더링
function AceLessonFlow({ aceLesson }) {
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-bold text-gray-700">ACE 수업 흐름</h4>
        <span className="text-[10px] text-gray-400">총 {aceLesson.totalMinutes}분</span>
      </div>

      {/* 시간 배분 바 */}
      <div className="flex rounded-full overflow-hidden h-2 mb-4 bg-gray-100">
        {aceLesson.intro?.minutes && (
          <div className="bg-gray-300" style={{ width: `${(aceLesson.intro.minutes / aceLesson.totalMinutes) * 100}%` }} title={`도입 ${aceLesson.intro.minutes}분`} />
        )}
        {aceLesson.acquire?.minutes && (
          <div className="bg-[#7C9EF5]" style={{ width: `${(aceLesson.acquire.minutes / aceLesson.totalMinutes) * 100}%` }} title={`Acquire ${aceLesson.acquire.minutes}분`} />
        )}
        {aceLesson.challenge?.minutes && (
          <div className="bg-[#F5A67C]" style={{ width: `${(aceLesson.challenge.minutes / aceLesson.totalMinutes) * 100}%` }} title={`Challenge ${aceLesson.challenge.minutes}분`} />
        )}
        {aceLesson.engage?.minutes && (
          <div className="bg-[#A78BFA]" style={{ width: `${(aceLesson.engage.minutes / aceLesson.totalMinutes) * 100}%` }} title={`Engage ${aceLesson.engage.minutes}분`} />
        )}
        {aceLesson.wrapup?.minutes && (
          <div className="bg-gray-300" style={{ width: `${(aceLesson.wrapup.minutes / aceLesson.totalMinutes) * 100}%` }} title={`마무리 ${aceLesson.wrapup.minutes}분`} />
        )}
      </div>

      {/* 시간 배분 범례 */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 mb-4 text-[10px] text-gray-500">
        {aceLesson.intro?.minutes && <span><span className="inline-block w-2 h-2 rounded-full bg-gray-300 mr-1" />도입 {aceLesson.intro.minutes}분</span>}
        {aceLesson.acquire?.minutes && <span><span className="inline-block w-2 h-2 rounded-full bg-[#7C9EF5] mr-1" />A {aceLesson.acquire.minutes}분</span>}
        {aceLesson.challenge?.minutes && <span><span className="inline-block w-2 h-2 rounded-full bg-[#F5A67C] mr-1" />C {aceLesson.challenge.minutes}분</span>}
        {aceLesson.engage?.minutes && <span><span className="inline-block w-2 h-2 rounded-full bg-[#A78BFA] mr-1" />E {aceLesson.engage.minutes}분</span>}
        {aceLesson.wrapup?.minutes && <span><span className="inline-block w-2 h-2 rounded-full bg-gray-300 mr-1" />마무리 {aceLesson.wrapup.minutes}분</span>}
      </div>

      {/* 타임라인 — 세로 라인 */}
      <div className="relative">
        <div className="absolute left-[9px] top-3 bottom-3 w-0.5 bg-gray-200 rounded-full" />
        <PhaseBlock phase="intro" data={aceLesson.intro} />
        <PhaseBlock phase="acquire" data={aceLesson.acquire} />
        <PhaseBlock phase="challenge" data={aceLesson.challenge} />
        <PhaseBlock phase="engage" data={aceLesson.engage} />
        <PhaseBlock phase="wrapup" data={aceLesson.wrapup} />
      </div>
    </div>
  )
}

export default function ActivityDetailModal({ activity, onClose, relatedActivities, onActivitySwitch }) {
  if (!activity) return null

  const {
    name, source, acePhase, difficulty,
    fmsCategories, fmsSkills, fitnessComponents,
    flow, rules, equipment, teachingTips,
    space, groupSize, durationMin, aceLesson,
  } = activity

  const hasAceLesson = !!aceLesson

  return (
    <Modal onClose={onClose} maxWidth="max-w-lg">
      {/* 스크롤 컨테이너 */}
      <div className="max-h-[80vh] overflow-y-auto -mx-6 px-6 -my-6 py-6">
        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="sticky top-0 float-right z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white/80 hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* 활동명 + 출처 */}
        <h3 className="text-lg font-bold text-gray-900 pr-8 mb-1">{name}</h3>
        {source && <p className="text-[11px] text-gray-400 mb-3">{source}</p>}

        {/* 배지 행 */}
        <div className="flex flex-wrap items-center gap-1.5 mb-4">
          <AceBadge phase={acePhase} />
          {fmsCategories?.map((cat) => (
            <span key={cat} className="text-[11px] bg-emerald-50 text-emerald-600 rounded-full px-2 py-0.5 font-medium">
              {cat}
            </span>
          ))}
          {difficulty && (
            <span className={`text-[11px] rounded-full px-2 py-0.5 font-medium ${DIFFICULTY_COLOR[difficulty] ?? ''}`}>
              {DIFFICULTY_LABEL[difficulty] ?? `Lv.${difficulty}`}
            </span>
          )}
        </div>

        {/* 기본 정보 */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mb-3">
          {space?.length > 0 && <span>장소: {space.join(', ')}</span>}
          {groupSize && <span>인원: {groupSize.min}~{groupSize.max}명</span>}
          {durationMin && <span>시간: {durationMin}분</span>}
        </div>

        {/* 준비물 */}
        {equipment?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {equipment.map((item) => (
              <span key={item} className="text-[11px] bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">
                {item}
              </span>
            ))}
          </div>
        )}

        {/* 구분선 */}
        <hr className="border-gray-100 mb-1" />

        {/* ACE 수업 흐름 (aceLesson이 있을 때) */}
        {hasAceLesson && <AceLessonFlow aceLesson={aceLesson} />}

        {/* 기존 단순 수업 흐름 (aceLesson이 없을 때) */}
        {!hasAceLesson && flow?.length > 0 && (
          <>
            <SectionTitle>수업 흐름</SectionTitle>
            <ol className="text-xs text-gray-600 leading-relaxed space-y-1 list-decimal list-inside">
              {flow.map((step, i) => <li key={i}>{step}</li>)}
            </ol>
          </>
        )}

        {/* 규칙 (aceLesson 없을 때만 — aceLesson에서는 game.rules로 표시) */}
        {!hasAceLesson && rules?.length > 0 && (
          <>
            <SectionTitle>규칙</SectionTitle>
            <ul className="text-xs text-gray-600 leading-relaxed space-y-1 list-disc list-inside">
              {rules.map((rule, i) => <li key={i}>{rule}</li>)}
            </ul>
          </>
        )}

        {/* FMS 기술 + 체력요소 */}
        {(fmsSkills?.length > 0 || fitnessComponents?.length > 0) && (
          <>
            <SectionTitle>FMS 기술 / 체력요소</SectionTitle>
            <div className="flex flex-wrap gap-1">
              {fmsSkills?.map((skill) => (
                <span key={skill} className="text-[11px] bg-blue-50 text-blue-600 rounded-full px-2 py-0.5">
                  {skill}
                </span>
              ))}
              {fitnessComponents?.map((comp) => (
                <span key={comp} className="text-[11px] bg-violet-50 text-violet-600 rounded-full px-2 py-0.5">
                  {comp}
                </span>
              ))}
            </div>
          </>
        )}

        {/* 교사 팁 */}
        {teachingTips?.length > 0 && (
          <>
            <SectionTitle>교사 팁</SectionTitle>
            <ul className="text-xs text-gray-600 leading-relaxed space-y-1">
              {teachingTips.map((tip, i) => (
                <li key={i} className="flex gap-1.5">
                  <span className="text-amber-400 flex-shrink-0">&#9679;</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </>
        )}

        {/* 아이디어 팁 패널 (Wave 4) */}
        <IdeaTipPanel
          activity={activity}
          relatedActivities={relatedActivities}
          onActivitySwitch={onActivitySwitch}
        />
      </div>
    </Modal>
  )
}
