// ACE 수업 흐름 컴포넌트 — 읽기/편집 모드 지원 + 폴딩 | 추출원본→ActivityDetailModal.jsx
import { useState } from 'react'

// ACE 단계별 색상·아이콘 설정
export const PHASE_CONFIG = {
  intro:     { label: '도입',       color: 'border-gray-300',   bg: 'bg-gray-50',    dot: 'bg-gray-400',   icon: '🎯' },
  acquire:   { label: 'Acquire',    color: 'border-blue-300',   bg: 'bg-blue-50',    dot: 'bg-[#7C9EF5]',  icon: '📘' },
  challenge: { label: 'Challenge',  color: 'border-orange-300', bg: 'bg-orange-50',  dot: 'bg-[#F5A67C]',  icon: '🔥' },
  engage:    { label: 'Engage',     color: 'border-purple-300', bg: 'bg-purple-50',  dot: 'bg-[#A78BFA]',  icon: '🏆' },
  wrapup:    { label: '마무리',     color: 'border-gray-300',   bg: 'bg-gray-50',    dot: 'bg-gray-400',   icon: '💬' },
}

// --- 폴딩 토글 헤더 ---
function CollapsibleSection({ title, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-[11px] font-semibold text-gray-500 hover:text-gray-700 transition-colors"
      >
        <span className={`transition-transform ${open ? 'rotate-90' : ''}`}>▶</span>
        {title}
      </button>
      {open && <div className="mt-1">{children}</div>}
    </div>
  )
}

// --- 메타인지 발문 (폴딩) ---
export function MetaQuestionBox({ question, isEditing, onChange }) {
  if (!question && !isEditing) return null
  return (
    <CollapsibleSection title="메타인지 발문">
      <div className="p-2.5 bg-amber-50/80 border border-amber-200/60 rounded-xl">
        {isEditing ? (
          <textarea
            value={question || ''}
            onChange={(e) => onChange?.(e.target.value)}
            placeholder="메타인지 발문을 입력하세요"
            className="w-full text-xs text-amber-800 bg-transparent border-none outline-none resize-none leading-relaxed"
            rows={2}
          />
        ) : (
          <>
            <p className="text-[11px] font-semibold text-amber-700 mb-0.5">메타인지 발문</p>
            <p className="text-xs text-amber-800 leading-relaxed italic">&ldquo;{question}&rdquo;</p>
          </>
        )}
      </div>
    </CollapsibleSection>
  )
}

// --- 피드백 포인트 (폴딩) ---
export function FeedbackList({ items, isEditing, onChange }) {
  if (!items?.length && !isEditing) return null
  return (
    <CollapsibleSection title="피드백 포인트">
      <div className="space-y-1">
        {(items || []).map((fb, i) => (
          <div key={i} className="text-[11px] text-gray-500 leading-relaxed pl-3 relative">
            <span className="absolute left-0 text-[10px]">💡</span>
            {isEditing ? (
              <input
                value={fb}
                onChange={(e) => {
                  const next = [...(items || [])]
                  next[i] = e.target.value
                  onChange?.(next)
                }}
                className="w-full bg-transparent border-b border-gray-200 outline-none text-[11px]"
              />
            ) : (
              <span>{fb}</span>
            )}
          </div>
        ))}
        {isEditing && (
          <button
            type="button"
            onClick={() => onChange?.([...(items || []), ''])}
            className="text-[10px] text-primary hover:underline ml-3"
          >
            + 피드백 추가
          </button>
        )}
      </div>
    </CollapsibleSection>
  )
}

// --- 스캐폴딩 팁 (폴딩) ---
export function ScaffoldingTip({ scaffolding, isEditing, onChange }) {
  if (!scaffolding && !isEditing) return null
  return (
    <CollapsibleSection title="스캐폴딩">
      <div className="flex flex-col gap-1">
        {(scaffolding?.down || isEditing) && (
          <div className="flex gap-1.5 items-start">
            <span className="flex-shrink-0 w-4 h-4 rounded bg-sky-100 text-sky-500 text-[10px] font-bold flex items-center justify-center">&#8595;</span>
            {isEditing ? (
              <input
                value={scaffolding?.down || ''}
                onChange={(e) => onChange?.({ ...scaffolding, down: e.target.value })}
                placeholder="하향 스캐폴딩"
                className="flex-1 text-[10px] bg-transparent border-b border-sky-200 outline-none text-sky-600"
              />
            ) : (
              <p className="text-[10px] text-sky-600 leading-relaxed">{scaffolding.down}</p>
            )}
          </div>
        )}
        {(scaffolding?.up || isEditing) && (
          <div className="flex gap-1.5 items-start">
            <span className="flex-shrink-0 w-4 h-4 rounded bg-rose-100 text-rose-500 text-[10px] font-bold flex items-center justify-center">&#8593;</span>
            {isEditing ? (
              <input
                value={scaffolding?.up || ''}
                onChange={(e) => onChange?.({ ...scaffolding, up: e.target.value })}
                placeholder="상향 스캐폴딩"
                className="flex-1 text-[10px] bg-transparent border-b border-rose-200 outline-none text-rose-600"
              />
            ) : (
              <p className="text-[10px] text-rose-600 leading-relaxed">{scaffolding.up}</p>
            )}
          </div>
        )}
      </div>
    </CollapsibleSection>
  )
}

// --- PhaseBlock (읽기 + 편집) ---
export function PhaseBlock({ phase, data, isEditing, onChange }) {
  const config = PHASE_CONFIG[phase]
  if (!config || !data) return null

  const updateField = (field, value) => {
    onChange?.(phase, { ...data, [field]: value })
  }

  const updateFlowItem = (index, value) => {
    const next = [...(data.flow || [])]
    next[index] = value
    onChange?.(phase, { ...data, flow: next })
  }

  const addFlowItem = () => {
    onChange?.(phase, { ...data, flow: [...(data.flow || []), ''] })
  }

  const updateDrill = (index, field, value) => {
    const next = [...(data.drills || [])]
    next[index] = { ...next[index], [field]: value }
    onChange?.(phase, { ...data, drills: next })
  }

  const updateMission = (index, field, value) => {
    const next = [...(data.missions || [])]
    next[index] = { ...next[index], [field]: value }
    onChange?.(phase, { ...data, missions: next })
  }

  const updateGame = (field, value) => {
    onChange?.(phase, { ...data, game: { ...data.game, [field]: value } })
  }

  return (
    <div className="relative pl-7 pb-4 last:pb-0">
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
        {isEditing ? (
          <input
            type="number"
            value={data.minutes || ''}
            onChange={(e) => updateField('minutes', Number(e.target.value))}
            className="w-12 text-[10px] text-gray-400 bg-transparent border-b border-gray-200 outline-none text-center"
            placeholder="분"
          />
        ) : (
          data.minutes && <span className="text-[10px] text-gray-400">{data.minutes}분</span>
        )}
      </div>

      {/* 목표 */}
      {(data.goal || isEditing) && (
        isEditing ? (
          <textarea
            value={data.goal || ''}
            onChange={(e) => updateField('goal', e.target.value)}
            placeholder="목표를 입력하세요"
            className="w-full text-[11px] text-gray-500 mb-2 leading-relaxed bg-transparent border-b border-gray-200 outline-none resize-none"
            rows={2}
          />
        ) : (
          <p className="text-[11px] text-gray-500 mb-2 leading-relaxed">{data.goal}</p>
        )
      )}

      {/* 도입/마무리: flow 목록 */}
      {(data.flow?.length > 0 || isEditing) && (phase === 'intro' || phase === 'wrapup') && (
        <ul className="space-y-0.5">
          {(data.flow || []).map((item, i) => (
            <li key={i} className="text-xs text-gray-600 leading-relaxed flex gap-1.5">
              <span className="text-gray-300 flex-shrink-0">&#8226;</span>
              {isEditing ? (
                <input
                  value={item}
                  onChange={(e) => updateFlowItem(i, e.target.value)}
                  className="flex-1 bg-transparent border-b border-gray-200 outline-none text-xs"
                />
              ) : (
                <span>{item}</span>
              )}
            </li>
          ))}
          {isEditing && (
            <li>
              <button type="button" onClick={addFlowItem} className="text-[10px] text-primary hover:underline ml-4">
                + 항목 추가
              </button>
            </li>
          )}
        </ul>
      )}

      {/* Acquire: 드릴 목록 */}
      {data.drills?.length > 0 && (
        <div className="space-y-2">
          {data.drills.map((drill, i) => (
            <div key={i} className={`p-2 rounded-lg ${config.bg}`}>
              {isEditing ? (
                <>
                  <input
                    value={drill.name || ''}
                    onChange={(e) => updateDrill(i, 'name', e.target.value)}
                    className="w-full text-xs font-semibold text-gray-700 bg-transparent border-b border-gray-200 outline-none mb-1"
                    placeholder="드릴명"
                  />
                  <textarea
                    value={drill.description || ''}
                    onChange={(e) => updateDrill(i, 'description', e.target.value)}
                    className="w-full text-[11px] text-gray-500 bg-transparent border-b border-gray-200 outline-none resize-none leading-relaxed"
                    placeholder="설명"
                    rows={2}
                  />
                </>
              ) : (
                <>
                  <p className="text-xs font-semibold text-gray-700">{drill.name}</p>
                  <p className="text-[11px] text-gray-500 leading-relaxed">{drill.description}</p>
                </>
              )}
              <ScaffoldingTip
                scaffolding={drill.scaffolding}
                isEditing={isEditing}
                onChange={(s) => updateDrill(i, 'scaffolding', s)}
              />
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
                {isEditing ? (
                  <>
                    <span className="text-xs text-gray-500">미션 {i + 1}:</span>
                    <input
                      value={mission.name || ''}
                      onChange={(e) => updateMission(i, 'name', e.target.value)}
                      className="flex-1 text-xs font-semibold text-gray-700 bg-transparent border-b border-gray-200 outline-none"
                      placeholder="미션명"
                    />
                    <input
                      type="number"
                      value={mission.minutes || ''}
                      onChange={(e) => updateMission(i, 'minutes', Number(e.target.value))}
                      className="w-10 text-[10px] text-gray-400 bg-transparent border-b border-gray-200 outline-none text-center"
                      placeholder="분"
                    />
                  </>
                ) : (
                  <>
                    <span className="text-xs font-semibold text-gray-700">미션 {i + 1}: {mission.name}</span>
                    {mission.minutes && <span className="text-[10px] text-gray-400">{mission.minutes}분</span>}
                  </>
                )}
              </div>
              {isEditing ? (
                <textarea
                  value={mission.description || ''}
                  onChange={(e) => updateMission(i, 'description', e.target.value)}
                  className="w-full text-[11px] text-gray-500 bg-transparent border-b border-gray-200 outline-none resize-none leading-relaxed mt-0.5"
                  placeholder="설명"
                  rows={2}
                />
              ) : (
                <p className="text-[11px] text-gray-500 leading-relaxed mt-0.5">{mission.description}</p>
              )}
              <ScaffoldingTip
                scaffolding={mission.scaffolding}
                isEditing={isEditing}
                onChange={(s) => updateMission(i, 'scaffolding', s)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Engage: 게임 상세 */}
      {data.game && (
        <div className={`p-2.5 rounded-lg ${config.bg}`}>
          {isEditing ? (
            <>
              <input
                value={data.game.name || ''}
                onChange={(e) => updateGame('name', e.target.value)}
                className="w-full text-xs font-semibold text-gray-700 bg-transparent border-b border-gray-200 outline-none mb-1"
                placeholder="게임명"
              />
              <textarea
                value={data.game.description || ''}
                onChange={(e) => updateGame('description', e.target.value)}
                className="w-full text-[11px] text-gray-500 bg-transparent border-b border-gray-200 outline-none resize-none leading-relaxed mb-1.5"
                placeholder="설명"
                rows={2}
              />
            </>
          ) : (
            <>
              <p className="text-xs font-semibold text-gray-700 mb-1">{data.game.name}</p>
              <p className="text-[11px] text-gray-500 leading-relaxed mb-1.5">{data.game.description}</p>
            </>
          )}
          {data.game.rules?.length > 0 && (
            <ul className="space-y-0.5">
              {data.game.rules.map((rule, i) => (
                <li key={i} className="text-[11px] text-gray-600 leading-relaxed flex gap-1.5">
                  <span className="text-purple-300 flex-shrink-0">▸</span>
                  {isEditing ? (
                    <input
                      value={rule}
                      onChange={(e) => {
                        const next = [...data.game.rules]
                        next[i] = e.target.value
                        updateGame('rules', next)
                      }}
                      className="flex-1 bg-transparent border-b border-gray-200 outline-none text-[11px]"
                    />
                  ) : (
                    <span>{rule}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
          <ScaffoldingTip
            scaffolding={data.game.scaffolding}
            isEditing={isEditing}
            onChange={(s) => updateGame('scaffolding', s)}
          />
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
      <MetaQuestionBox
        question={data.metaQuestion}
        isEditing={isEditing}
        onChange={(v) => updateField('metaQuestion', v)}
      />

      {/* 피드백 */}
      <FeedbackList
        items={data.feedback}
        isEditing={isEditing}
        onChange={(v) => updateField('feedback', v)}
      />
    </div>
  )
}

// --- ACE 수업 흐름 전체 렌더링 (읽기 + 편집 모드) ---
export default function AceLessonFlow({ aceLesson, isEditing, onAceLessonChange }) {
  const handlePhaseChange = (phase, updatedData) => {
    if (!onAceLessonChange) return
    const updated = { ...aceLesson, [phase]: updatedData }
    // totalMinutes 재계산
    const phases = ['intro', 'acquire', 'challenge', 'engage', 'wrapup']
    updated.totalMinutes = phases.reduce((sum, p) => sum + (updated[p]?.minutes || 0), 0)
    onAceLessonChange(updated)
  }

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-bold text-gray-700">ACE 수업 흐름</h4>
        <span className="text-[10px] text-gray-400">총 {aceLesson.totalMinutes}분</span>
      </div>

      {/* 시간 배분 바 */}
      <div className="flex rounded-full overflow-hidden h-2 mb-4 bg-gray-100">
        {aceLesson.intro?.minutes > 0 && (
          <div className="bg-gray-300" style={{ width: `${(aceLesson.intro.minutes / aceLesson.totalMinutes) * 100}%` }} title={`도입 ${aceLesson.intro.minutes}분`} />
        )}
        {aceLesson.acquire?.minutes > 0 && (
          <div className="bg-[#7C9EF5]" style={{ width: `${(aceLesson.acquire.minutes / aceLesson.totalMinutes) * 100}%` }} title={`Acquire ${aceLesson.acquire.minutes}분`} />
        )}
        {aceLesson.challenge?.minutes > 0 && (
          <div className="bg-[#F5A67C]" style={{ width: `${(aceLesson.challenge.minutes / aceLesson.totalMinutes) * 100}%` }} title={`Challenge ${aceLesson.challenge.minutes}분`} />
        )}
        {aceLesson.engage?.minutes > 0 && (
          <div className="bg-[#A78BFA]" style={{ width: `${(aceLesson.engage.minutes / aceLesson.totalMinutes) * 100}%` }} title={`Engage ${aceLesson.engage.minutes}분`} />
        )}
        {aceLesson.wrapup?.minutes > 0 && (
          <div className="bg-gray-300" style={{ width: `${(aceLesson.wrapup.minutes / aceLesson.totalMinutes) * 100}%` }} title={`마무리 ${aceLesson.wrapup.minutes}분`} />
        )}
      </div>

      {/* 시간 배분 범례 */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 mb-4 text-[10px] text-gray-500">
        {aceLesson.intro?.minutes > 0 && <span><span className="inline-block w-2 h-2 rounded-full bg-gray-300 mr-1" />도입 {aceLesson.intro.minutes}분</span>}
        {aceLesson.acquire?.minutes > 0 && <span><span className="inline-block w-2 h-2 rounded-full bg-[#7C9EF5] mr-1" />A {aceLesson.acquire.minutes}분</span>}
        {aceLesson.challenge?.minutes > 0 && <span><span className="inline-block w-2 h-2 rounded-full bg-[#F5A67C] mr-1" />C {aceLesson.challenge.minutes}분</span>}
        {aceLesson.engage?.minutes > 0 && <span><span className="inline-block w-2 h-2 rounded-full bg-[#A78BFA] mr-1" />E {aceLesson.engage.minutes}분</span>}
        {aceLesson.wrapup?.minutes > 0 && <span><span className="inline-block w-2 h-2 rounded-full bg-gray-300 mr-1" />마무리 {aceLesson.wrapup.minutes}분</span>}
      </div>

      {/* 타임라인 — 세로 라인 */}
      <div className="relative">
        <div className="absolute left-[9px] top-3 bottom-3 w-0.5 bg-gray-200 rounded-full" />
        <PhaseBlock phase="intro" data={aceLesson.intro} isEditing={isEditing} onChange={handlePhaseChange} />
        <PhaseBlock phase="acquire" data={aceLesson.acquire} isEditing={isEditing} onChange={handlePhaseChange} />
        <PhaseBlock phase="challenge" data={aceLesson.challenge} isEditing={isEditing} onChange={handlePhaseChange} />
        <PhaseBlock phase="engage" data={aceLesson.engage} isEditing={isEditing} onChange={handlePhaseChange} />
        <PhaseBlock phase="wrapup" data={aceLesson.wrapup} isEditing={isEditing} onChange={handlePhaseChange} />
      </div>
    </div>
  )
}
