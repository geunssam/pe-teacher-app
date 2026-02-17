// 차시카드 전체 컨텍스트 수집기 — LessonTimeline 차시카드 → AI 채팅 컨텍스트 주입용
import { gatherLessonContext } from './gatherLessonContext'

/**
 * 차시카드의 활동/성취기준/단원 정보를 AI 채팅에 전달할 구조로 수집
 *
 * @param {Object} lesson - lessonPlan 항목 (lesson, title, description, acePhase, fmsFocus, standardCodes, activityIds)
 * @param {Object} unit - 단원 객체 (id, title, grade, domain, totalLessons, lessonPlan)
 * @param {Object} options
 * @param {Function} options.getActivityById - 활동 ID → 활동 객체
 * @param {Function} options.getStandardByCode - 성취기준 코드 → 성취기준 객체
 * @param {Array}   options.units - 전체 단원 목록
 * @returns {Object} lessonContext
 */
export function gatherLessonCardContext(lesson, unit, { getActivityById, getStandardByCode, units } = {}) {
  const context = {
    lessonInfo: {
      lesson: lesson.lesson,
      title: lesson.title,
      description: lesson.description || '',
      acePhase: lesson.acePhase || '',
      fmsFocus: lesson.fmsFocus || [],
      standardCodes: lesson.standardCodes || [],
    },
    unitInfo: {
      id: unit.id,
      title: unit.title,
      grade: unit.grade,
      domain: unit.domain,
      totalLessons: unit.totalLessons,
    },
    standards: [],
    activities: [],
    // gatherLessonContext 병합용
    skills: [],
    gameActivities: [],
    sportRules: null,
    modifiers: [],
  }

  // 1. 성취기준 전문 수집
  if (getStandardByCode && lesson.standardCodes?.length) {
    context.standards = lesson.standardCodes
      .map((code) => {
        const std = getStandardByCode(code)
        return std ? { code, text: std.text } : { code, text: '' }
      })
      .filter((s) => s.text)
  }

  // 2. 차시 내 활동 정보 수집 + 기존 gatherLessonContext 병합
  if (getActivityById && lesson.activityIds?.length) {
    for (const id of lesson.activityIds) {
      const activity = getActivityById(id)
      if (!activity) continue

      context.activities.push({
        id: activity.id,
        name: activity.name,
        space: activity.space || [],
        equipment: activity.equipment || [],
        flow: activity.flow || [],
        acePhase: activity.acePhase || '',
      })

      // 각 활동의 기술/게임/규칙/변형 수집 (기존 함수 재사용)
      const actCtx = gatherLessonContext(activity, { getStandardByCode, units })

      // 병합 (중복 제거)
      for (const skill of actCtx.skills) {
        if (!context.skills.some((s) => s.name === skill.name)) {
          context.skills.push(skill)
        }
      }
      for (const game of actCtx.gameActivities) {
        if (!context.gameActivities.some((g) => g.name === game.name)) {
          context.gameActivities.push(game)
        }
      }
      if (!context.sportRules && actCtx.sportRules) {
        context.sportRules = actCtx.sportRules
      }
      for (const mod of actCtx.modifiers) {
        if (!context.modifiers.some((m) => m.name === mod.name)) {
          context.modifiers.push(mod)
        }
      }
    }
  }

  return context
}
