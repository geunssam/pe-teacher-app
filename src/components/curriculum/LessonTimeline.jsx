// 차시 타임라인 — 선택된 단원의 lessonPlan을 세로 타임라인으로 표시 | GlassCard→common/GlassCard.jsx
import { useState } from 'react'
import GlassCard from '../common/GlassCard'
import AceBadge from './AceBadge'
import { gatherLessonCardContext } from '../../utils/curriculum/gatherLessonCardContext'

const isCustomActivityId = (activityId) => String(activityId).startsWith('alt_')

export default function LessonTimeline({
  unit,
  units,
  getActivityById,
  getStandardByCode,
  onActivityClick,
  onBack,
  onAddAlternative,
  onRemoveAlternative,
  getAlternativeActivityIds,
}) {
  const [expandedAlts, setExpandedAlts] = useState({})

  const toggleAlts = (lesson) => {
    setExpandedAlts((prev) => ({ ...prev, [lesson]: !prev[lesson] }))
  }

  const resolveAlternativeIds = (lesson) => {
    const baseIds = lesson.alternativeActivityIds ?? []
    const merged = getAlternativeActivityIds ? getAlternativeActivityIds(unit.id, lesson.lesson) : []
    const customIds = merged.filter((id) => isCustomActivityId(id))
    const standardIds = baseIds.filter((id) => !isCustomActivityId(id))
    return [...standardIds, ...customIds]
  }

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          단원 선택으로
        </button>
      </div>

      <h2 className="text-lg font-bold text-gray-900 mb-1">{unit.title}</h2>
      <p className="text-xs text-gray-400 mb-5">{unit.grade} &middot; {unit.domain} &middot; {unit.totalLessons}차시</p>

      {/* 타임라인 */}
      <div className="relative">
        {/* 세로 라인 */}
        <div className="absolute left-[18px] top-2 bottom-2 w-0.5 bg-gray-200 rounded-full" />

        <div className="flex flex-col gap-3">
          {unit.lessonPlan.map((lesson) => (
            <div key={lesson.lesson} className="relative flex gap-4">
              {/* 타임라인 도트 */}
              <div className="relative z-10 flex-shrink-0 w-9 h-9 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                {lesson.lesson}
              </div>

              {/* 카드 */}
              <GlassCard className="flex-1 p-4">
                {/* ACE 배지 + 제목 + AI 버튼 */}
                <div className="flex items-start gap-2 mb-2">
                  <AceBadge phase={lesson.acePhase} />
                  <h4 className="text-sm font-semibold text-gray-900 leading-snug flex-1">{lesson.title}</h4>
                  <button
                    type="button"
                    onClick={() => {
                      const ctx = gatherLessonCardContext(lesson, unit, {
                        getActivityById,
                        getStandardByCode,
                        units: units || [unit],
                      })
                      const label = `${unit.grade} ${unit.title} ${lesson.lesson}차시: ${lesson.title}`
                      window.dispatchEvent(new CustomEvent('pe-ai-chat-open', {
                        detail: { type: 'lesson-context', lessonContext: ctx, displayLabel: label },
                      }))
                    }}
                    className="flex-shrink-0 flex items-center gap-1 text-xs font-semibold text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg px-2.5 py-1 transition-colors"
                  >
                    <img src="/ai-sparkle-sm.png" alt="" width="16" height="16" className="pointer-events-none" />
                    AI 질문
                  </button>
                </div>

                {/* 설명 */}
                <p className="text-xs text-gray-500 mb-3 leading-relaxed">{lesson.description}</p>

                {/* FMS 칩 */}
                {lesson.fmsFocus?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {lesson.fmsFocus.map((fms) => (
                      <span key={fms} className="text-[10px] bg-emerald-50 text-emerald-600 rounded-full px-2 py-0.5 font-medium">
                        {fms}
                      </span>
                    ))}
                  </div>
                )}

                {/* 성취기준 전문 */}
                {lesson.standardCodes?.length > 0 && getStandardByCode && (
                  <div className="space-y-1 mb-3">
                    {lesson.standardCodes.map((code) => {
                      const std = getStandardByCode(code)
                      return (
                        <p key={code} className="text-[11px] text-gray-500 bg-gray-50 rounded-lg px-2.5 py-1.5 leading-relaxed">
                          <span className="font-semibold text-gray-600">{code}</span>{' '}
                          {std?.text || ''}
                        </p>
                      )
                    })}
                  </div>
                )}

                {/* 활동 버튼 */}
                <div className="flex flex-wrap gap-1.5">
                  {lesson.activityIds.map((id) => {
                    const activity = getActivityById(id)
                    return (
                      <button
                        key={id}
                        onClick={() => activity && onActivityClick(activity)}
                        className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg px-2.5 py-1.5 font-medium transition-colors"
                      >
                        {activity?.name ?? id}
                      </button>
                    )
                  })}
                </div>

                {/* 대체 활동 */}
                <div className="mt-2">
                  {resolveAlternativeIds(lesson).length > 0 && (
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => toggleAlts(lesson.lesson)}
                        className="text-[11px] text-gray-400 hover:text-gray-500 transition-colors"
                        type="button"
                      >
                        {expandedAlts[lesson.lesson]
                          ? '대체 활동 숨기기'
                          : `대체 활동 ${resolveAlternativeIds(lesson).length}개`}
                      </button>
                      {onAddAlternative && (
                        <button
                          onClick={() => onAddAlternative(lesson)}
                          className="text-[11px] text-blue-500 hover:text-blue-600 transition-colors"
                          type="button"
                        >
                          + 추가
                        </button>
                      )}
                    </div>
                  )}

                  {(resolveAlternativeIds(lesson).length === 0 && onAddAlternative) && (
                    <button
                      onClick={() => onAddAlternative(lesson)}
                      className="text-[11px] text-blue-500 hover:text-blue-600 transition-colors"
                      type="button"
                    >
                      + 대체 활동 추가
                    </button>
                  )}

                  {expandedAlts[lesson.lesson] && resolveAlternativeIds(lesson).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {resolveAlternativeIds(lesson).map((id) => {
                        const activity = getActivityById(id)
                        const custom = isCustomActivityId(id)
                        return (
                          <div key={id} className="inline-flex items-start gap-1.5">
                            <button
                              onClick={() => activity && onActivityClick(activity)}
                              className="text-xs bg-gray-50 text-gray-500 hover:bg-gray-100 rounded-lg px-2.5 py-1.5 font-medium transition-colors"
                            >
                              {activity?.name ?? id}
                            </button>
                            {custom && onRemoveAlternative && (
                              <button
                                type="button"
                                onClick={() => onRemoveAlternative(unit.id, lesson.lesson, id)}
                                className="text-[11px] text-rose-500 border border-rose-100 rounded-full px-2 py-1 leading-none hover:bg-rose-50"
                                aria-label={`${activity?.name ?? id} 삭제`}
                              >
                                삭제
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </GlassCard>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
