// 교육과정 데이터 레이어 — 전학년 활동 통합 + 내 활동 CRUD + 관련활동 검색 | 데이터→src/data/curriculum/
import { useMemo, useCallback } from 'react'
import { useLocalStorage } from './useLocalStorage'
import { generateId } from '../utils/generateId'
import unitTemplatesData from '../data/curriculum/unitTemplates.json'
import standardsData from '../data/curriculum/standards.json'

// 3~6학년 전체 활동 import
import g3Movement from '../data/curriculum/activities/grade3_movement.json'
import g3Sports from '../data/curriculum/activities/grade3_sports.json'
import g4Sports from '../data/curriculum/activities/grade4_sports.json'
import g5Sports from '../data/curriculum/activities/grade5_sports.json'
import g6Sports from '../data/curriculum/activities/grade6_sports.json'

const ALL_SOURCES = [g3Movement, g3Sports, g4Sports, g5Sports, g6Sports]

export function useCurriculum() {
  const units = useMemo(() => unitTemplatesData.templates, [])

  // --- 정적 활동 맵 (ALL_SOURCES 95개) ---
  const staticActivityMap = useMemo(() => {
    const map = new Map()
    for (const source of ALL_SOURCES) {
      const domain = source.meta?.domain || '스포츠'
      source.activities.forEach((a) => map.set(a.id, { ...a, domain }))
    }
    return map
  }, [])

  // --- 성취기준 맵 (모든 gradeBand 순회) ---
  const standardMap = useMemo(() => {
    const map = new Map()
    for (const gradeBand of Object.values(standardsData.gradeBands)) {
      for (const domain of Object.values(gradeBand.domains)) {
        if (!domain.standards) continue
        domain.standards.forEach((s) => map.set(s.code, s))
      }
    }
    return map
  }, [])

  const aceModel = useMemo(() => standardsData.aceModel, [])

  // --- 내 활동 CRUD (localStorage) ---
  const [myActivities, setMyActivities] = useLocalStorage('curriculum_my_activities_v1', {})

  const myActivityMap = useMemo(() => {
    const map = new Map()
    if (myActivities) {
      for (const [id, activity] of Object.entries(myActivities)) {
        map.set(id, activity)
      }
    }
    return map
  }, [myActivities])

  const myActivityList = useMemo(() => {
    if (!myActivities) return []
    return Object.values(myActivities).sort(
      (a, b) => (b.createdAt || 0) - (a.createdAt || 0)
    )
  }, [myActivities])

  const addMyActivity = useCallback((activity) => {
    const id = generateId('my')
    const now = Date.now()
    const saved = {
      ...activity,
      id,
      sourceTag: 'my',
      createdAt: now,
      updatedAt: now,
    }
    setMyActivities((prev) => ({ ...(prev || {}), [id]: saved }))
    return saved
  }, [setMyActivities])

  const updateMyActivity = useCallback((id, updates) => {
    setMyActivities((prev) => {
      if (!prev?.[id]) return prev
      const { id: _ignoreId, ...rest } = updates
      return {
        ...prev,
        [id]: { ...prev[id], ...rest, id, updatedAt: Date.now() },
      }
    })
  }, [setMyActivities])

  const deleteMyActivity = useCallback((id) => {
    setMyActivities((prev) => {
      if (!prev?.[id]) return prev
      const next = { ...prev }
      delete next[id]
      return next
    })
  }, [setMyActivities])

  // --- 통합 조회 체인: myActivityMap → staticActivityMap → null ---
  const getActivityById = useCallback(
    (id) => myActivityMap.get(id) ?? staticActivityMap.get(id) ?? null,
    [myActivityMap, staticActivityMap]
  )

  const getStandardByCode = useCallback(
    (code) => standardMap.get(code) ?? null,
    [standardMap]
  )

  // --- 관련 활동 검색 (가중 점수 매칭) ---
  const findRelatedActivities = useCallback(
    (activity, limit = 5) => {
      if (!activity) return []

      const baseFms = new Set(activity.fmsSkills || [])
      const baseTags = new Set(activity.tags || [])
      const baseCats = new Set(activity.fmsCategories || [])
      const baseId = activity.id

      const scored = []
      const seen = new Set()

      const score = (candidate) => {
        if (candidate.id === baseId || seen.has(candidate.id)) return
        seen.add(candidate.id)

        let pts = 0
        for (const s of candidate.fmsSkills || []) if (baseFms.has(s)) pts += 3
        for (const t of candidate.tags || []) if (baseTags.has(t)) pts += 2
        for (const c of candidate.fmsCategories || []) if (baseCats.has(c)) pts += 1

        if (pts > 0) scored.push({ activity: candidate, score: pts })
      }

      staticActivityMap.forEach(score)
      myActivityMap.forEach(score)

      scored.sort((a, b) => b.score - a.score)
      return scored.slice(0, limit).map((s) => s.activity)
    },
    [staticActivityMap, myActivityMap]
  )

  return {
    units,
    aceModel,
    myActivityList,
    getActivityById,
    getStandardByCode,
    findRelatedActivities,
    addMyActivity,
    updateMyActivity,
    deleteMyActivity,
  }
}
