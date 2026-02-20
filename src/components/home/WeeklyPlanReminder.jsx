// 주간 수업 계획 알림 — 금요일/월요일에 주간 계획 리마인더 표시 | 부모→pages/HomePage.jsx
import { useState } from 'react'

/**
 * 금요일: "다음 주 수업 계획을 확인해보세요"
 * 월요일: "이번 주 수업 계획입니다"
 * 그 외 요일: 렌더링하지 않음
 *
 * @param {array}    plans          - useAnnualPlan의 plans 배열
 * @param {array}    teachableWeeks - useSchoolCalendar의 teachableWeeks 배열
 * @param {string}   weekKey        - 현재 주차 키 (예: "2026-W12")
 * @param {function} onNavigate     - "수업 설계 보기" 클릭 콜백
 */
export default function WeeklyPlanReminder({ plans, teachableWeeks, weekKey, onNavigate }) {
  const dayOfWeek = new Date().getDay() // 0=일, 1=월, ..., 5=금, 6=토
  const isFriday = dayOfWeek === 5
  const isMonday = dayOfWeek === 1

  // 금/월 외에는 렌더링하지 않음
  if (!isFriday && !isMonday) return null

  const dismissKey = `pe_plan_reminder_dismissed_${weekKey || 'unknown'}`
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(dismissKey) === 'true' } catch { return false }
  })

  if (dismissed) return null

  const handleDismiss = () => {
    setDismissed(true)
    try { localStorage.setItem(dismissKey, 'true') } catch { /* noop */ }
  }

  // 현재/다음 주 계획 필터링
  const targetWeek = isFriday ? getNextWeekKey(weekKey) : weekKey
  const weekPlans = Array.isArray(plans)
    ? plans.filter((p) => p.weekKey === targetWeek)
    : []

  const title = isFriday ? '다음 주 수업 계획을 확인해보세요' : '이번 주 수업 계획입니다'
  const hasPlans = weekPlans.length > 0

  return (
    <div
      className="relative rounded-2xl p-4 mb-0"
      style={{
        background: 'linear-gradient(145deg, rgba(255,255,255,0.55), rgba(255,255,255,0.2))',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.6)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
      }}
    >
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-[13px] font-bold text-gray-800">{title}</h3>
        <button
          onClick={handleDismiss}
          className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          aria-label="닫기"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* 계획 목록 */}
      {hasPlans ? (
        <ul className="space-y-1 mb-3">
          {weekPlans.map((plan, i) => (
            <li key={plan.id || i} className="text-[12px] text-gray-600 leading-relaxed">
              <span className="text-gray-400 mr-1">&bull;</span>
              {plan.grade && <span className="font-medium text-gray-700">{plan.grade}: </span>}
              {plan.title || plan.domain || '활동 미정'}
              {plan.sessions && (
                <span className="text-gray-400 ml-1">({plan.sessions})</span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[12px] text-gray-400 mb-3">
          아직 등록된 연간 계획이 없습니다
        </p>
      )}

      {/* 수업 설계 보기 버튼 */}
      {onNavigate && (
        <button
          onClick={onNavigate}
          className="text-[12px] font-semibold px-3 py-1.5 rounded-lg transition-colors"
          style={{ color: '#7C9EF5', background: 'rgba(124,158,245,0.1)' }}
        >
          수업 설계 보기
        </button>
      )}
    </div>
  )
}

/** 주차 키에서 다음 주 키 계산 (예: "2026-W12" → "2026-W13") */
function getNextWeekKey(weekKey) {
  if (!weekKey || typeof weekKey !== 'string') return undefined
  const match = weekKey.match(/^(\d{4})-W(\d{1,2})$/)
  if (!match) return undefined
  const year = parseInt(match[1], 10)
  const week = parseInt(match[2], 10)
  // 간단 처리: 53주 넘으면 다음 해 W01
  if (week >= 52) return `${year + 1}-W01`
  return `${year}-W${String(week + 1).padStart(2, '0')}`
}
