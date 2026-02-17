// 수업 활동 아카이브 훅 — 저장된 활동 CRUD (Firestore + localStorage fallback) | 사용처→SketchPage/LibraryPage
import { useState, useCallback, useEffect, useRef } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../services/firebase'
import { useLocalStorage } from './useLocalStorage'
import { getUid } from './useDataSource'
import { setDocument, getDocument, getCollection, deleteDocument } from '../services/firestore'
import { generateId } from '../utils/generateId'

/**
 * 저장된 수업 활동 관리 Hook
 *
 * localStorage 스키마:
 * - pe_saved_activities: [{ id, title, domain, sport, ... }]
 *
 * Firestore paths:
 * - users/{uid}/savedActivities/{activityId}
 */
export function useSavedActivities() {
  const [activities, setActivities] = useLocalStorage('pe_saved_activities', [])
  const firestoreLoaded = useRef(false)
  const [dataReady, setDataReady] = useState(false)

  // Load from Firestore when authenticated
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setDataReady(true)
        return
      }

      if (firestoreLoaded.current) {
        setDataReady(true)
        return
      }
      firestoreLoaded.current = true

      try {
        const docs = await getCollection(`users/${user.uid}/savedActivities`)
        if (docs?.length) {
          setActivities(docs)
        }
      } catch (err) {
        console.warn('[useSavedActivities] Firestore load failed:', err.message)
      } finally {
        setDataReady(true)
      }
    })

    return () => unsubscribe()
  }, [])

  // Sync single activity to Firestore
  const syncToFirestore = useCallback((activity) => {
    const uid = getUid()
    if (uid && activity?.id) {
      setDocument(`users/${uid}/savedActivities/${activity.id}`, activity, false).catch((err) => {
        console.error('Failed to sync saved activity:', err)
      })
    }
  }, [])

  /**
   * 활동 저장
   * @param {object} data - { title, domain, sport, description, materials, tags, gradeLevel, source }
   * @returns {object} 생성된 활동
   */
  const addActivity = useCallback((data) => {
    const now = new Date().toISOString()
    const activity = {
      id: `saved_${generateId()}`,
      title: data.title || '',
      domain: data.domain || '스포츠',
      sport: data.sport || '',
      description: data.description || '',
      materials: data.materials || [],
      tags: data.tags || [],
      gradeLevel: data.gradeLevel || [],
      usageCount: 0,
      lastUsedAt: null,
      source: data.source || 'manual',
      createdAt: now,
      updatedAt: now,
      ...data,
      id: `saved_${generateId()}`,
      createdAt: now,
      updatedAt: now,
    }

    setActivities((prev) => {
      const next = [activity, ...prev]
      return next
    })
    syncToFirestore(activity)

    return activity
  }, [syncToFirestore])

  /**
   * 활동 업데이트
   */
  const updateActivity = useCallback((activityId, updates) => {
    const now = new Date().toISOString()

    setActivities((prev) => {
      const next = prev.map((a) =>
        a.id === activityId ? { ...a, ...updates, updatedAt: now } : a
      )
      const updated = next.find((a) => a.id === activityId)
      if (updated) syncToFirestore(updated)
      return next
    })
  }, [syncToFirestore])

  /**
   * 활동 삭제
   */
  const removeActivity = useCallback((activityId) => {
    setActivities((prev) => prev.filter((a) => a.id !== activityId))

    const uid = getUid()
    if (uid) {
      deleteDocument(`users/${uid}/savedActivities/${activityId}`).catch((err) => {
        console.error('Failed to delete saved activity:', err)
      })
    }
  }, [])

  /**
   * 활동 조회
   */
  const getActivity = useCallback((activityId) => {
    return activities.find((a) => a.id === activityId) || null
  }, [activities])

  /**
   * 사용 횟수 증가 + 최근 사용일 갱신
   */
  const incrementUsage = useCallback((activityId) => {
    const now = new Date().toISOString()

    setActivities((prev) => {
      const next = prev.map((a) =>
        a.id === activityId
          ? { ...a, usageCount: (a.usageCount || 0) + 1, lastUsedAt: now, updatedAt: now }
          : a
      )
      const updated = next.find((a) => a.id === activityId)
      if (updated) syncToFirestore(updated)
      return next
    })
  }, [syncToFirestore])

  /**
   * 도메인별 필터
   */
  const getByDomain = useCallback((domain) => {
    return activities.filter((a) => a.domain === domain)
  }, [activities])

  /**
   * 태그로 검색
   */
  const searchByTag = useCallback((tag) => {
    const lower = tag.toLowerCase()
    return activities.filter((a) =>
      a.tags?.some((t) => t.toLowerCase().includes(lower))
    )
  }, [activities])

  return {
    activities,
    dataReady,
    addActivity,
    updateActivity,
    removeActivity,
    getActivity,
    incrementUsage,
    getByDomain,
    searchByTag,
  }
}
