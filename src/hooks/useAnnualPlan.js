// 연간계획 훅 — 학년별 연간 수업 계획 CRUD (차시 풀 + 주차별 배정, Firestore + localStorage fallback) | 사용처→CurriculumPage/WeeklyPlanView
import { useCallback, useEffect, useRef, useMemo } from 'react'
import { useLocalStorage } from './useLocalStorage'
import { getUid } from './useDataSource'
import { setDocument, getDocument, getCollection, deleteDocument } from '../services/firestore'
import { generatePlanId, generatePoolLessonId } from '../utils/generateId'
import unitTemplatesData from '../data/curriculum/unitTemplates.json'

const PLANS_KEY = 'pe_annual_plans'
const PROGRESS_KEY = 'pe_plan_progress'

// ===== Helper =====

function findTemplate(templateId) {
  return unitTemplatesData.templates.find((t) => t.id === templateId) || null
}

/**
 * 기존 units[] 데이터를 새 lessonPool[] + weekSlots{} 형식으로 마이그레이션
 */
function migratePlanToNewFormat(plan) {
  if (plan.lessonPool) return plan // 이미 새 형식

  const units = plan.units || []
  const lessonPool = []
  const weekSlots = {}

  for (const unit of units) {
    const lessons = unit.lessons || []
    const poolIds = []

    for (const lesson of lessons) {
      const poolId = generatePoolLessonId()
      lessonPool.push({
        poolId,
        sourceTemplateId: unit.sourceTemplateId || null,
        unitTitle: unit.title || '',
        domain: unit.domain || '스포츠',
        lesson: lesson.lesson,
        acePhase: lesson.acePhase || 'A',
        title: lesson.title || '',
        activityIds: [...(lesson.activityIds || [])],
        note: lesson.note || '',
        included: true,
      })
      poolIds.push(poolId)
    }

    // 주차 범위가 있으면 weekSlots으로 변환
    if (unit.weekStart && unit.weekEnd) {
      // 단순화: 시작 주에 모든 차시 배치 (이후 자동 배정으로 재분배 가능)
      if (poolIds.length > 0) {
        weekSlots[unit.weekStart] = [
          ...(weekSlots[unit.weekStart] || []),
          ...poolIds,
        ]
      }
    }
  }

  return {
    ...plan,
    lessonPool,
    weekSlots,
    units: undefined, // 기존 필드 제거
  }
}

// ===== Hook =====

export function useAnnualPlan() {
  const [plans, setPlans] = useLocalStorage(PLANS_KEY, [])
  const firestoreLoaded = useRef(false)

  // Progress state — { planId: { classId: { completedPoolIds: [] } } }
  const [progress, setProgress] = useLocalStorage(PROGRESS_KEY, {})
  const progressFirestoreLoaded = useRef(false)

  // --- Firestore 동기화 ---

  useEffect(() => {
    const uid = getUid()
    if (!uid || firestoreLoaded.current) return
    firestoreLoaded.current = true

    async function loadFromFirestore() {
      try {
        const docs = await getCollection(`users/${uid}/annualPlans`)
        if (docs && docs.length > 0) {
          // 마이그레이션 적용
          const migrated = docs.map(migratePlanToNewFormat)
          setPlans(migrated)
          // 마이그레이션된 plan은 다시 저장
          for (const plan of migrated) {
            if (!docs.find((d) => d.id === plan.id)?.lessonPool) {
              setDocument(`users/${uid}/annualPlans/${plan.id}`, plan, false).catch(() => {})
            }
          }
        }
      } catch (err) {
        console.warn('[useAnnualPlan] Firestore load failed, using localStorage:', err.message)
      }
    }

    loadFromFirestore()
  }, [])

  // localStorage에서 로드할 때도 마이그레이션
  useEffect(() => {
    if (plans.some((p) => p.units && !p.lessonPool)) {
      const migrated = plans.map(migratePlanToNewFormat)
      setPlans(migrated)
    }
  }, []) // 최초 1회만

  const syncPlanToFirestore = useCallback((plan) => {
    const uid = getUid()
    if (uid) {
      setDocument(`users/${uid}/annualPlans/${plan.id}`, plan, false).catch((err) => {
        console.error('[useAnnualPlan] Firestore sync failed:', err)
      })
    }
  }, [])

  const deletePlanFromFirestore = useCallback((planId) => {
    const uid = getUid()
    if (uid) {
      deleteDocument(`users/${uid}/annualPlans/${planId}`).catch((err) => {
        console.error('[useAnnualPlan] Firestore delete failed:', err)
      })
    }
  }, [])

  // --- 내부 업데이트 헬퍼 ---

  const updatePlanInList = useCallback((planId, updater) => {
    setPlans((prev) => {
      const idx = prev.findIndex((p) => p.id === planId)
      if (idx === -1) return prev

      const updated = {
        ...prev[idx],
        ...updater(prev[idx]),
        updatedAt: new Date().toISOString(),
      }
      const next = [...prev]
      next[idx] = updated
      syncPlanToFirestore(updated)
      return next
    })
  }, [setPlans, syncPlanToFirestore])

  // --- Firestore 동기화: Progress ---

  useEffect(() => {
    const uid = getUid()
    if (!uid || progressFirestoreLoaded.current) return
    progressFirestoreLoaded.current = true

    async function loadProgress() {
      try {
        const docs = await getCollection(`users/${uid}/planProgress`)
        if (docs && docs.length > 0) {
          const merged = {}
          for (const doc of docs) {
            if (doc.id) merged[doc.id] = doc.data || doc
          }
          if (Object.keys(merged).length > 0) {
            setProgress(merged)
          }
        }
      } catch (err) {
        console.warn('[useAnnualPlan] Progress Firestore load failed:', err.message)
      }
    }

    loadProgress()
  }, [])

  const syncProgressToFirestore = useCallback((planId, data) => {
    const uid = getUid()
    if (uid) {
      setDocument(`users/${uid}/planProgress/${planId}`, data, false).catch((err) => {
        console.error('[useAnnualPlan] Progress sync failed:', err)
      })
    }
  }, [])

  // --- Plan CRUD ---

  const getPlanByGrade = useCallback((grade) => {
    return plans.find((p) => p.grade === grade) || null
  }, [plans])

  const createPlan = useCallback(({ year, grade, title }) => {
    const now = new Date().toISOString()
    const plan = {
      id: generatePlanId(),
      year,
      grade,
      title: title || `${grade} 연간 수업 계획`,
      lessonPool: [],
      weekSlots: {},
      createdAt: now,
      updatedAt: now,
    }

    setPlans((prev) => {
      const next = [...prev, plan]
      syncPlanToFirestore(plan)
      return next
    })

    return plan
  }, [setPlans, syncPlanToFirestore])

  const deletePlan = useCallback((planId) => {
    setPlans((prev) => prev.filter((p) => p.id !== planId))
    deletePlanFromFirestore(planId)
  }, [setPlans, deletePlanFromFirestore])

  // --- 차시 풀 관리 ---

  /** 단원 템플릿의 차시들을 풀에 추가 */
  const importTemplateToPool = useCallback((planId, templateId) => {
    const template = findTemplate(templateId)
    if (!template) {
      console.warn(`[useAnnualPlan] Template not found: ${templateId}`)
      return
    }

    const newLessons = (template.lessonPlan || []).map((lp) => ({
      poolId: generatePoolLessonId(),
      sourceTemplateId: templateId,
      unitTitle: template.title,
      domain: template.domain,
      lesson: lp.lesson,
      acePhase: lp.acePhase,
      title: lp.title,
      activityIds: [...(lp.activityIds || [])],
      note: '',
      included: true,
    }))

    updatePlanInList(planId, (plan) => ({
      lessonPool: [...(plan.lessonPool || []), ...newLessons],
    }))
  }, [updatePlanInList])

  /** 해당 템플릿 차시 일괄 삭제 (풀에서 제거 + weekSlots에서도 제거) */
  const removeTemplateFromPool = useCallback((planId, templateId) => {
    updatePlanInList(planId, (plan) => {
      const removingIds = new Set(
        (plan.lessonPool || [])
          .filter((lp) => lp.sourceTemplateId === templateId)
          .map((lp) => lp.poolId)
      )

      const newPool = (plan.lessonPool || []).filter((lp) => lp.sourceTemplateId !== templateId)

      // weekSlots에서도 제거
      const newWeekSlots = {}
      for (const [weekKey, ids] of Object.entries(plan.weekSlots || {})) {
        const filtered = ids.filter((id) => !removingIds.has(id))
        if (filtered.length > 0) {
          newWeekSlots[weekKey] = filtered
        }
      }

      return { lessonPool: newPool, weekSlots: newWeekSlots }
    })
  }, [updatePlanInList])

  /** 직접 차시 추가 */
  const addCustomLesson = useCallback((planId, { title, domain, acePhase, unitTitle }) => {
    const newLesson = {
      poolId: generatePoolLessonId(),
      sourceTemplateId: null,
      unitTitle: unitTitle || '직접 추가',
      domain: domain || '스포츠',
      lesson: 0,
      acePhase: acePhase || 'A',
      title: title || '',
      activityIds: [],
      note: '',
      included: true,
    }

    updatePlanInList(planId, (plan) => ({
      lessonPool: [...(plan.lessonPool || []), newLesson],
    }))

    return newLesson
  }, [updatePlanInList])

  /** 차시 편집 */
  const updatePoolLesson = useCallback((planId, poolId, updates) => {
    updatePlanInList(planId, (plan) => ({
      lessonPool: (plan.lessonPool || []).map((lp) =>
        lp.poolId === poolId ? { ...lp, ...updates } : lp
      ),
    }))
  }, [updatePlanInList])

  /** 영구 삭제 */
  const removePoolLesson = useCallback((planId, poolId) => {
    updatePlanInList(planId, (plan) => {
      const newPool = (plan.lessonPool || []).filter((lp) => lp.poolId !== poolId)
      // weekSlots에서도 제거
      const newWeekSlots = {}
      for (const [weekKey, ids] of Object.entries(plan.weekSlots || {})) {
        const filtered = ids.filter((id) => id !== poolId)
        if (filtered.length > 0) {
          newWeekSlots[weekKey] = filtered
        }
      }
      return { lessonPool: newPool, weekSlots: newWeekSlots }
    })
  }, [updatePlanInList])

  /** 포함/제외 토글 */
  const toggleLessonIncluded = useCallback((planId, poolId) => {
    updatePlanInList(planId, (plan) => {
      const lesson = (plan.lessonPool || []).find((lp) => lp.poolId === poolId)
      if (!lesson) return {}
      const newIncluded = !lesson.included

      // 제외하면 weekSlots에서도 제거
      let newWeekSlots = plan.weekSlots
      if (!newIncluded) {
        newWeekSlots = {}
        for (const [weekKey, ids] of Object.entries(plan.weekSlots || {})) {
          const filtered = ids.filter((id) => id !== poolId)
          if (filtered.length > 0) {
            newWeekSlots[weekKey] = filtered
          }
        }
      }

      return {
        lessonPool: (plan.lessonPool || []).map((lp) =>
          lp.poolId === poolId ? { ...lp, included: newIncluded } : lp
        ),
        weekSlots: newWeekSlots,
      }
    })
  }, [updatePlanInList])

  // --- 주차 배정 ---

  /** 차시를 주에 추가 */
  const assignLessonToWeek = useCallback((planId, poolId, weekKey) => {
    updatePlanInList(planId, (plan) => {
      const existing = plan.weekSlots?.[weekKey] || []
      if (existing.includes(poolId)) return {} // 이미 있음

      // 다른 주에서 제거
      const newWeekSlots = {}
      for (const [wk, ids] of Object.entries(plan.weekSlots || {})) {
        const filtered = ids.filter((id) => id !== poolId)
        if (filtered.length > 0) {
          newWeekSlots[wk] = filtered
        }
      }

      // 대상 주에 추가
      newWeekSlots[weekKey] = [...(newWeekSlots[weekKey] || []), poolId]
      return { weekSlots: newWeekSlots }
    })
  }, [updatePlanInList])

  /** 주에서 제거 (풀로 반환) */
  const removeLessonFromWeek = useCallback((planId, poolId, weekKey) => {
    updatePlanInList(planId, (plan) => {
      const newWeekSlots = { ...(plan.weekSlots || {}) }
      const existing = newWeekSlots[weekKey] || []
      const filtered = existing.filter((id) => id !== poolId)
      if (filtered.length > 0) {
        newWeekSlots[weekKey] = filtered
      } else {
        delete newWeekSlots[weekKey]
      }
      return { weekSlots: newWeekSlots }
    })
  }, [updatePlanInList])

  /** 주 내 순서 변경 */
  const reorderWeekLessons = useCallback((planId, weekKey, orderedPoolIds) => {
    updatePlanInList(planId, (plan) => ({
      weekSlots: {
        ...(plan.weekSlots || {}),
        [weekKey]: orderedPoolIds,
      },
    }))
  }, [updatePlanInList])

  /** 주 간 이동 */
  const moveLessonToWeek = useCallback((planId, poolId, fromWeek, toWeek) => {
    updatePlanInList(planId, (plan) => {
      const newWeekSlots = { ...(plan.weekSlots || {}) }

      // from 에서 제거
      if (fromWeek && newWeekSlots[fromWeek]) {
        const filtered = newWeekSlots[fromWeek].filter((id) => id !== poolId)
        if (filtered.length > 0) {
          newWeekSlots[fromWeek] = filtered
        } else {
          delete newWeekSlots[fromWeek]
        }
      }

      // to에 추가
      newWeekSlots[toWeek] = [...(newWeekSlots[toWeek] || []), poolId]
      return { weekSlots: newWeekSlots }
    })
  }, [updatePlanInList])

  /** 자동 배정 — 미배정 + included 차시를 주차별로 분배 */
  const autoFillWeeks = useCallback((planId, teachableWeeksArr, weeklyPEHours = 3) => {
    const plan = plans.find((p) => p.id === planId)
    if (!plan || !teachableWeeksArr?.length) return

    const pool = plan.lessonPool || []
    const perWeek = Math.max(1, weeklyPEHours)

    // 이미 배정된 poolId 집합
    const assignedIds = new Set()
    for (const ids of Object.values(plan.weekSlots || {})) {
      for (const id of ids) assignedIds.add(id)
    }

    // 미배정 + included 차시 목록
    const unassigned = pool
      .filter((lp) => lp.included && !assignedIds.has(lp.poolId))
      .map((lp) => lp.poolId)

    if (unassigned.length === 0) return

    // 기존 weekSlots 유지하면서 빈 주에 채우기
    const newWeekSlots = { ...(plan.weekSlots || {}) }
    let lessonIdx = 0

    for (const week of teachableWeeksArr) {
      if (lessonIdx >= unassigned.length) break

      const existing = newWeekSlots[week.weekKey] || []
      const remaining = perWeek - existing.length

      if (remaining > 0) {
        const toAdd = unassigned.slice(lessonIdx, lessonIdx + remaining)
        newWeekSlots[week.weekKey] = [...existing, ...toAdd]
        lessonIdx += toAdd.length
      }
    }

    updatePlanInList(planId, () => ({ weekSlots: newWeekSlots }))
  }, [plans, updatePlanInList])

  // --- 계산 ---

  /** 영역 분포 (included만) */
  const getDomainDistribution = useCallback((planId) => {
    const plan = plans.find((p) => p.id === planId)
    if (!plan) return {}

    const dist = {}
    for (const lp of (plan.lessonPool || [])) {
      if (!lp.included) continue
      const domain = lp.domain || '미분류'
      dist[domain] = (dist[domain] || 0) + 1
    }
    return dist
  }, [plans])

  /** 계획 요약 */
  const getPlanSummary = useCallback((planId) => {
    const plan = plans.find((p) => p.id === planId)
    if (!plan) return { totalLessons: 0, assignedCount: 0, unassignedCount: 0 }

    const pool = (plan.lessonPool || []).filter((lp) => lp.included)
    const totalLessons = pool.length

    const assignedIds = new Set()
    for (const ids of Object.values(plan.weekSlots || {})) {
      for (const id of ids) assignedIds.add(id)
    }

    const assignedCount = pool.filter((lp) => assignedIds.has(lp.poolId)).length
    const unassignedCount = totalLessons - assignedCount

    return { totalLessons, assignedCount, unassignedCount }
  }, [plans])

  /** 미배정 + included 차시 목록 */
  const getUnassignedLessons = useCallback((planId) => {
    const plan = plans.find((p) => p.id === planId)
    if (!plan) return []

    const assignedIds = new Set()
    for (const ids of Object.values(plan.weekSlots || {})) {
      for (const id of ids) assignedIds.add(id)
    }

    return (plan.lessonPool || []).filter(
      (lp) => lp.included && !assignedIds.has(lp.poolId)
    )
  }, [plans])

  /** 해당 주 차시 객체 배열 */
  const getLessonsForWeek = useCallback((planId, weekKey) => {
    const plan = plans.find((p) => p.id === planId)
    if (!plan) return []

    const poolIds = plan.weekSlots?.[weekKey] || []
    const poolMap = new Map((plan.lessonPool || []).map((lp) => [lp.poolId, lp]))

    return poolIds.map((id) => poolMap.get(id)).filter(Boolean)
  }, [plans])

  // --- 진도 추적 ---

  /** 차시 완료 표시 */
  const markLessonComplete = useCallback((planId, classId, poolId) => {
    setProgress((prev) => {
      const planProgress = { ...(prev[planId] || {}) }
      const classProgress = { ...(planProgress[classId] || { completedPoolIds: [] }) }

      // 기존 unitIndex/lessonIndex 형식이면 새 형식으로 변환
      if (!classProgress.completedPoolIds) {
        classProgress.completedPoolIds = []
      }

      if (!classProgress.completedPoolIds.includes(poolId)) {
        classProgress.completedPoolIds = [...classProgress.completedPoolIds, poolId]
      }

      planProgress[classId] = classProgress
      const next = { ...prev, [planId]: planProgress }
      syncProgressToFirestore(planId, planProgress)
      return next
    })
  }, [setProgress, syncProgressToFirestore])

  /** 학급별 진도 조회 */
  const getClassProgress = useCallback((planId, classId) => {
    const plan = plans.find((p) => p.id === planId)
    if (!plan) return null

    const pool = (plan.lessonPool || []).filter((lp) => lp.included)
    const totalCount = pool.length
    if (totalCount === 0) return null

    const planProgress = progress[planId] || {}
    const classData = planProgress[classId] || {}
    const completedPoolIds = classData.completedPoolIds || []
    const completedCount = completedPoolIds.length

    return {
      completedCount,
      totalCount,
      percent: Math.round((completedCount / totalCount) * 100),
      completedPoolIds,
    }
  }, [plans, progress])

  // --- 시간표 오버레이 ---

  const getScheduleOverlay = useCallback((planId, classId, weekKey, baseTimetable) => {
    const plan = plans.find((p) => p.id === planId)
    if (!plan || !baseTimetable) return {}

    // 1. 체육 교시 셀 추출 (요일-교시 순서)
    const dayOrder = ['mon', 'tue', 'wed', 'thu', 'fri']
    const peCells = Object.entries(baseTimetable)
      .filter(([, cell]) => cell?.subject === '체육')
      .sort(([a], [b]) => {
        const [dayA, periodA] = a.split('-')
        const [dayB, periodB] = b.split('-')
        const dayDiff = dayOrder.indexOf(dayA) - dayOrder.indexOf(dayB)
        return dayDiff !== 0 ? dayDiff : Number(periodA) - Number(periodB)
      })
      .map(([key]) => key)

    if (peCells.length === 0) return {}

    // 2. weekKey가 있으면 해당 주의 차시, 없으면 진도 기반
    const poolMap = new Map((plan.lessonPool || []).map((lp) => [lp.poolId, lp]))

    let lessonsToMap = []

    if (weekKey && plan.weekSlots?.[weekKey]) {
      // weekSlots에서 해당 주 차시 가져오기
      lessonsToMap = (plan.weekSlots[weekKey] || [])
        .map((id) => poolMap.get(id))
        .filter(Boolean)
    } else {
      // weekKey 없으면 진도 기반 (완료되지 않은 순서대로)
      const planProgress = progress[planId] || {}
      const classData = planProgress[classId] || {}
      const completedSet = new Set(classData.completedPoolIds || [])

      // 전체 풀에서 미완료 + included 순서대로
      lessonsToMap = (plan.lessonPool || [])
        .filter((lp) => lp.included && !completedSet.has(lp.poolId))
    }

    // 3. 셀에 매핑
    const overlay = {}
    for (let i = 0; i < peCells.length && i < lessonsToMap.length; i++) {
      const lp = lessonsToMap[i]
      overlay[peCells[i]] = {
        poolId: lp.poolId,
        unitTitle: lp.unitTitle,
        lessonNumber: lp.lesson,
        lessonTitle: lp.title,
      }
    }

    return overlay
  }, [plans, progress])

  return {
    plans,
    getPlanByGrade,
    createPlan,
    deletePlan,

    // 차시 풀 관리
    importTemplateToPool,
    removeTemplateFromPool,
    addCustomLesson,
    updatePoolLesson,
    removePoolLesson,
    toggleLessonIncluded,

    // 주차 배정
    assignLessonToWeek,
    removeLessonFromWeek,
    reorderWeekLessons,
    moveLessonToWeek,
    autoFillWeeks,

    // 계산
    getDomainDistribution,
    getPlanSummary,
    getUnassignedLessons,
    getLessonsForWeek,

    // 진도
    markLessonComplete,
    getClassProgress,

    // 시간표 오버레이
    getScheduleOverlay,
  }
}
