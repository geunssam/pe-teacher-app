// N차시 시퀀스 생성기 — 차시별 phase 매핑 + 중복 방지 + 구조 다양성 | 호출→hooks/useRecommend.js, 엔진→activityEngine.js + generateModularCandidates.js
import { generateActivityCandidates } from './activityEngine.js'
import { generateModularCandidates } from './generateModularCandidates.js'

// 차시별 phase 매핑 (1-indexed)
const LESSON_PHASE_MAP = {
  1: '기본',
  2: '기본',
  3: '응용',
  4: '챌린지',
  5: '챌린지',
}

/**
 * generateNLessonSequence(request, lessonCount)
 * request: useRecommend에서 넘겨주는 기본 조건 (grade, sport, space, ...)
 * lessonCount: 생성할 차시 수 (2~5)
 *
 * 각 차시마다 preferredPhase를 설정해 generateModularCandidates를 호출하고,
 * 누적 history로 중복을 방지하고, usedStructures로 구조 다양성을 확보한다.
 *
 * 반환: { lessons: [{ lessonNumber, phase, candidate }], meta }
 */
export function generateNLessonSequence(request, lessonCount = 3) {
  const count = Math.max(2, Math.min(5, lessonCount))
  const lessons = []
  const usedTitles = new Set()
  const usedStructureIds = new Set()
  const sequenceId = `seq-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  for (let i = 1; i <= count; i += 1) {
    const phase = LESSON_PHASE_MAP[i] || '기본'

    const reqForLesson = {
      ...request,
      preferredPhase: phase,
      lessonHistory: [
        ...(request.lessonHistory || []),
        ...Array.from(usedTitles),
      ],
      excludeStructureIds: Array.from(usedStructureIds),
    }

    // Try CSV engine first, fallback to modular engine
    let result = generateActivityCandidates(reqForLesson)
    if (result.candidates.length === 0) {
      result = generateModularCandidates(reqForLesson)
    }

    // Pick the best candidate that we haven't used yet
    const candidate = result.candidates.find(
      (c) => !usedTitles.has(c.title) && !usedStructureIds.has(c.structureId)
    ) || result.candidates[0] || null

    if (candidate) {
      usedTitles.add(candidate.title)
      usedStructureIds.add(candidate.structureId)
      lessons.push({
        lessonNumber: i,
        phase,
        candidate: {
          ...candidate,
          lessonNumber: i,
          sequenceId,
          phase,
        },
      })
    } else {
      lessons.push({
        lessonNumber: i,
        phase,
        candidate: null,
        failureReason: result.meta?.reason || '후보를 생성하지 못했습니다.',
      })
    }
  }

  const successCount = lessons.filter((l) => l.candidate).length

  return {
    lessons,
    sequenceId,
    meta: {
      engine: 'n-lesson-sequence',
      lessonCount: count,
      successCount,
      failureCount: count - successCount,
    },
  }
}
