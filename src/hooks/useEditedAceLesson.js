// 편집된 ACE 수업안 관리 훅 — localStorage 기반 | 사용처→ActivityDetailModal, CurriculumPage, SchedulePage
import { useLocalStorage } from './useLocalStorage'

/**
 * 편집된 ACE 수업안 관리 Hook
 *
 * localStorage 키: pe_edited_ace_lessons
 * 데이터 구조:
 * {
 *   [activityId]: {
 *     activityId: string,
 *     activityName: string,
 *     aceLesson: { ... },   // 편집된 aceLesson 객체
 *     updatedAt: string      // ISO date
 *   }
 * }
 */
export function useEditedAceLesson() {
  const [editedLessons, setEditedLessons] = useLocalStorage('pe_edited_ace_lessons', {})

  /**
   * 편집된 ACE 수업안 조회
   * @param {string} activityId
   * @returns {{ activityId, activityName, aceLesson, updatedAt } | null}
   */
  const getEditedAceLesson = (activityId) => {
    if (!activityId) return null
    return editedLessons[activityId] || null
  }

  /**
   * 편집된 ACE 수업안 저장
   * @param {string} activityId
   * @param {string} activityName
   * @param {object} aceLesson - 편집된 aceLesson 객체
   */
  const saveEditedAceLesson = (activityId, activityName, aceLesson) => {
    if (!activityId || !aceLesson) return

    setEditedLessons((prev) => ({
      ...prev,
      [activityId]: {
        activityId,
        activityName,
        aceLesson,
        updatedAt: new Date().toISOString(),
      },
    }))
  }

  /**
   * 편집된 ACE 수업안 삭제 (원본으로 복원)
   * @param {string} activityId
   */
  const deleteEditedAceLesson = (activityId) => {
    if (!activityId) return

    setEditedLessons((prev) => {
      const next = { ...prev }
      delete next[activityId]
      return next
    })
  }

  /**
   * 편집된 버전이 존재하는지 확인
   * @param {string} activityId
   * @returns {boolean}
   */
  const hasEditedVersion = (activityId) => {
    if (!activityId) return false
    return !!editedLessons[activityId]
  }

  return {
    getEditedAceLesson,
    saveEditedAceLesson,
    deleteEditedAceLesson,
    hasEditedVersion,
  }
}
