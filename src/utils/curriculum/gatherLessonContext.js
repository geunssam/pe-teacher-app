// AI 수업안 컨텍스트 수집기 — 활동 메타데이터 + 교육과정 데이터를 결합 | 사용처→ActivityDetailModal.jsx
import sportsData from '../../data/modules/sports.json'
import skillsData from '../../data/modules/skills.json'
import activitiesData from '../../data/modules/activities.json'
import modifiersData from '../../data/modules/modifiers.json'

const sportsMap = new Map(sportsData.sports.map((s) => [s.id, s]))
const skillsArr = skillsData.skills
const activitiesArr = activitiesData.activities
const modifiersArr = modifiersData.modifiers

/**
 * 활동 데이터 + 교육과정 컨텍스트를 수집하여 AI 프롬프트에 전달할 구조화된 객체 반환
 *
 * @param {Object} activity - 교육과정 활동 객체 (getActivityById 결과)
 * @param {Object} options
 * @param {Function} options.getStandardByCode - 성취기준 코드 → 성취기준 객체
 * @param {Array}   options.units - 단원 목록 (unitTemplates.templates)
 * @returns {Object} context
 */
export function gatherLessonContext(activity, { getStandardByCode, units } = {}) {
  const context = {
    standards: [],
    unitContext: null,
    skills: [],
    gameActivities: [],
    sportRules: null,
    modifiers: [],
  }

  if (!activity) return context

  // 1. 성취기준 원문 수집
  if (getStandardByCode && activity.standardCodes?.length) {
    context.standards = activity.standardCodes
      .map((code) => {
        const std = getStandardByCode(code)
        return std ? { code, text: std.text, explanation: std.explanation } : null
      })
      .filter(Boolean)
  }

  // 2. 단원 맥락 (이 활동이 속한 단원, 차시 위치, 전후 차시)
  if (units?.length) {
    for (const unit of units) {
      const lessons = unit.lessonPlan || []
      for (const lesson of lessons) {
        if (lesson.activityIds?.includes(activity.id)) {
          const idx = lessons.indexOf(lesson)
          context.unitContext = {
            unitTitle: unit.title,
            grade: unit.grade,
            domain: unit.domain,
            totalLessons: unit.totalLessons,
            currentLesson: lesson.lesson,
            currentTitle: lesson.title,
            acePhase: lesson.acePhase,
            prevLesson: idx > 0 ? { lesson: lessons[idx - 1].lesson, title: lessons[idx - 1].title } : null,
            nextLesson: idx < lessons.length - 1 ? { lesson: lessons[idx + 1].lesson, title: lessons[idx + 1].title } : null,
          }
          break
        }
      }
      if (context.unitContext) break
    }
  }

  // 3. 관련 기술 자료 (FMS 카테고리/기술 매칭)
  const fmsSet = new Set([...(activity.fmsCategories || []), ...(activity.fmsSkills || [])])
  if (fmsSet.size > 0) {
    const matched = skillsArr.filter((skill) => {
      const skillFms = new Set(skill.fms || [])
      for (const f of fmsSet) {
        if (skillFms.has(f) || skill.fmsCategory === f) return true
      }
      return false
    })
    context.skills = matched.slice(0, 5).map((s) => ({
      name: s.name,
      sport: s.sport,
      teachingCues: s.teachingCues,
      commonErrors: s.commonErrors,
      quickFixes: s.quickFixes,
      slotMapping: s.slotMapping,
    }))
  }

  // 4. 관련 게임 활동 (FMS 카테고리 매칭)
  const fmsCats = new Set(activity.fmsCategories || [])
  if (fmsCats.size > 0) {
    const matched = activitiesArr.filter((a) => {
      if (a.id === activity.id) return false
      const cats = new Set(a.compatibleFmsCategories || [])
      for (const c of fmsCats) {
        if (cats.has(c)) return true
      }
      return false
    })
    context.gameActivities = matched.slice(0, 5).map((a) => ({
      name: a.name,
      suitablePhase: a.suitablePhase,
      flow: a.flow,
      space: a.space,
    }))
  }

  // 5. 종목 규칙 (활동의 tags/domain에서 종목 매칭)
  // Try matching by activity's domain tags or direct sport reference
  const sportName = activity.domain || ''
  for (const [, sport] of sportsMap) {
    if (sport.name === sportName || (activity.tags || []).includes(sport.id)) {
      context.sportRules = {
        name: sport.name,
        coreRules: sport.coreRules,
        safetyRules: sport.safetyRules,
        requiredConcepts: sport.requiredConcepts,
      }
      break
    }
  }

  // 6. 적용 가능한 변형 규칙 (종목명 or 전체 매칭)
  const sportNameForMod = context.sportRules?.name || sportName
  const matched = modifiersArr.filter((m) => {
    const allows = m.sportAllow || []
    return allows.includes('전체') || allows.includes(sportNameForMod)
  })
  context.modifiers = matched.slice(0, 4).map((m) => ({
    name: m.name,
    type: m.type,
    ruleOverride: m.ruleOverride,
    setupExample: m.setupExample,
    teacherMeaning: m.teacherMeaning,
  }))

  return context
}
