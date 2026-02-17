// 편집된 ACE 수업안 관리 훅 — Firestore + localStorage fallback | 사용처→ActivityDetailModal, CurriculumPage, SchedulePage
import { useCallback, useEffect, useRef } from 'react'
import { useLocalStorage } from './useLocalStorage'
import { getUid } from './useDataSource'
import { setDocument, deleteDocument, getCollection } from '../services/firestore'

/**
 * 편집된 ACE 수업안 관리 Hook
 *
 * localStorage 키: pe_edited_ace_lessons
 * Firestore path: users/{uid}/editedLessons/{activityId}
 *
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
  const firestoreLoaded = useRef(false)

  // Load from Firestore on mount (if authenticated)
  useEffect(() => {
    const uid = getUid()
    if (!uid || firestoreLoaded.current) return
    firestoreLoaded.current = true

    async function loadFromFirestore() {
      try {
        const docs = await getCollection(`users/${uid}/editedLessons`)
        if (docs?.length) {
          const loaded = {}
          for (const doc of docs) {
            const { id, ...data } = doc
            loaded[data.activityId || id] = { ...data, activityId: data.activityId || id }
          }
          setEditedLessons(loaded)
        }
      } catch (err) {
        console.warn('[useEditedAceLesson] Firestore load failed, using localStorage:', err.message)
      }
    }

    loadFromFirestore()
  }, [])

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
  const saveEditedAceLesson = useCallback((activityId, activityName, aceLesson) => {
    if (!activityId || !aceLesson) return

    const entry = {
      activityId,
      activityName,
      aceLesson,
      updatedAt: new Date().toISOString(),
    }

    setEditedLessons((prev) => ({
      ...prev,
      [activityId]: entry,
    }))

    // Sync to Firestore
    const uid = getUid()
    if (uid) {
      setDocument(`users/${uid}/editedLessons/${activityId}`, entry, false).catch((err) => {
        console.error('Failed to sync edited lesson:', err)
      })
    }
  }, [setEditedLessons])

  /**
   * 편집된 ACE 수업안 삭제 (원본으로 복원)
   * @param {string} activityId
   */
  const deleteEditedAceLesson = useCallback((activityId) => {
    if (!activityId) return

    setEditedLessons((prev) => {
      const next = { ...prev }
      delete next[activityId]
      return next
    })

    // Delete from Firestore
    const uid = getUid()
    if (uid) {
      deleteDocument(`users/${uid}/editedLessons/${activityId}`).catch((err) => {
        console.error('Failed to delete edited lesson from Firestore:', err)
      })
    }
  }, [setEditedLessons])

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
