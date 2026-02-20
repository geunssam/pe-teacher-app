// 연간계획 훅 — 학년별 연간 수업 계획 CRUD (단원/차시/주차 배정, Firestore + localStorage fallback) | 사용처→CurriculumPage/AnnualPlanView
import { useCallback, useEffect, useRef, useMemo } from 'react'
import { useLocalStorage } from './useLocalStorage'
import { getUid } from './useDataSource'
import { setDocument, getDocument, getCollection, deleteDocument } from '../services/firestore'
import { generatePlanId, generatePlanUnitId } from '../utils/generateId'
import unitTemplatesData from '../data/curriculum/unitTemplates.json'

const PLANS_KEY = 'pe_annual_plans'
const PROGRESS_KEY = 'pe_plan_progress'
const OVERRIDES_KEY = 'pe_weekly_overrides'

// ===== Helper =====

/**
 * unitTemplates.json에서 templateId로 템플릿 찾기
 */
function findTemplate(templateId) {
  return unitTemplatesData.templates.find((t) => t.id === templateId) || null
}

/**
 * lessonPlan → unit.lessons 변환
 * 템플릿의 lessonPlan 배열을 plan의 lessons 형태로 복사
 */
function convertLessonPlanToLessons(lessonPlan) {
  return lessonPlan.map((lp) => ({
    lesson: lp.lesson,
    acePhase: lp.acePhase,
    title: lp.title,
    activityIds: [...lp.activityIds],
    note: '',
  }))
}

// ===== Hook =====

export function useAnnualPlan() {
  const [plans, setPlans] = useLocalStorage(PLANS_KEY, [])
  const firestoreLoaded = useRef(false)

  // Progress & Overrides state
  const [progress, setProgress] = useLocalStorage(PROGRESS_KEY, {})
  const progressFirestoreLoaded = useRef(false)
  const [overrides, setOverrides] = useLocalStorage(OVERRIDES_KEY, {})
  const overridesFirestoreLoaded = useRef(false)

  // --- Firestore 동기화 ---

  useEffect(() => {
    const uid = getUid()
    if (!uid || firestoreLoaded.current) return
    firestoreLoaded.current = true

    async function loadFromFirestore() {
      try {
        const docs = await getCollection(`users/${uid}/annualPlans`)
        if (docs && docs.length > 0) {
          setPlans(docs)
        }
      } catch (err) {
        console.warn('[useAnnualPlan] Firestore load failed, using localStorage:', err.message)
      }
    }

    loadFromFirestore()
  }, [])

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

  /** plans 배열 내 특정 plan을 업데이트하고 Firestore 동기화 */
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
      units: [],
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

  // --- Unit CRUD ---

  const addUnitFromTemplate = useCallback((planId, templateId) => {
    const template = findTemplate(templateId)
    if (!template) {
      console.warn(`[useAnnualPlan] Template not found: ${templateId}`)
      return null
    }

    const unit = {
      id: generatePlanUnitId(),
      sourceTemplateId: templateId,
      title: template.title,
      domain: template.domain,
      totalLessons: template.totalLessons,
      weekStart: null,
      weekEnd: null,
      standardCodes: [...template.standardCodes],
      lessons: convertLessonPlanToLessons(template.lessonPlan),
    }

    updatePlanInList(planId, (plan) => ({
      units: [...plan.units, unit],
    }))

    return unit
  }, [updatePlanInList])

  const addCustomUnit = useCallback((planId, { title, domain, totalLessons, standardCodes }) => {
    const unit = {
      id: generatePlanUnitId(),
      sourceTemplateId: null,
      title,
      domain,
      totalLessons: totalLessons || 0,
      weekStart: null,
      weekEnd: null,
      standardCodes: standardCodes || [],
      lessons: [],
    }

    updatePlanInList(planId, (plan) => ({
      units: [...plan.units, unit],
    }))

    return unit
  }, [updatePlanInList])

  const updateUnit = useCallback((planId, unitId, updates) => {
    updatePlanInList(planId, (plan) => ({
      units: plan.units.map((u) => (u.id === unitId ? { ...u, ...updates } : u)),
    }))
  }, [updatePlanInList])

  const removeUnit = useCallback((planId, unitId) => {
    updatePlanInList(planId, (plan) => ({
      units: plan.units.filter((u) => u.id !== unitId),
    }))
  }, [updatePlanInList])

  const reorderUnits = useCallback((planId, unitIds) => {
    updatePlanInList(planId, (plan) => {
      const unitMap = new Map(plan.units.map((u) => [u.id, u]))
      const reordered = unitIds
        .map((id) => unitMap.get(id))
        .filter(Boolean)
      return { units: reordered }
    })
  }, [updatePlanInList])

  // --- Lesson CRUD ---

  const updateLesson = useCallback((planId, unitId, lessonNumber, updates) => {
    updatePlanInList(planId, (plan) => ({
      units: plan.units.map((u) => {
        if (u.id !== unitId) return u
        return {
          ...u,
          lessons: u.lessons.map((l) =>
            l.lesson === lessonNumber ? { ...l, ...updates } : l
          ),
        }
      }),
    }))
  }, [updatePlanInList])

  const addLesson = useCallback((planId, unitId, lessonData) => {
    updatePlanInList(planId, (plan) => ({
      units: plan.units.map((u) => {
        if (u.id !== unitId) return u
        const nextLessonNum = u.lessons.length > 0
          ? Math.max(...u.lessons.map((l) => l.lesson)) + 1
          : 1
        const newLesson = {
          lesson: nextLessonNum,
          acePhase: 'A',
          title: '',
          activityIds: [],
          note: '',
          ...lessonData,
        }
        return {
          ...u,
          lessons: [...u.lessons, newLesson],
          totalLessons: u.totalLessons + 1,
        }
      }),
    }))
  }, [updatePlanInList])

  const removeLesson = useCallback((planId, unitId, lessonNumber) => {
    updatePlanInList(planId, (plan) => ({
      units: plan.units.map((u) => {
        if (u.id !== unitId) return u
        const filtered = u.lessons.filter((l) => l.lesson !== lessonNumber)
        // Re-number lessons
        const renumbered = filtered.map((l, i) => ({ ...l, lesson: i + 1 }))
        return {
          ...u,
          lessons: renumbered,
          totalLessons: renumbered.length,
        }
      }),
    }))
  }, [updatePlanInList])

  // --- Week Assignment ---

  const assignUnitWeeks = useCallback((planId, unitId, { weekStart, weekEnd }) => {
    updateUnit(planId, unitId, { weekStart, weekEnd })
  }, [updateUnit])

  // --- 계산 ---

  const getDomainDistribution = useCallback((planId) => {
    const plan = plans.find((p) => p.id === planId)
    if (!plan) return {}

    const dist = {}
    for (const unit of plan.units) {
      const domain = unit.domain || '미분류'
      dist[domain] = (dist[domain] || 0) + unit.totalLessons
    }
    return dist
  }, [plans])

  const getPlanSummary = useCallback((planId) => {
    const plan = plans.find((p) => p.id === planId)
    if (!plan) return { totalUnits: 0, totalLessons: 0, assignedWeeks: 0, unassignedWeeks: 0 }

    const totalUnits = plan.units.length
    const totalLessons = plan.units.reduce((sum, u) => sum + u.totalLessons, 0)
    const assignedWeeks = plan.units.filter((u) => u.weekStart && u.weekEnd).length
    const unassignedWeeks = totalUnits - assignedWeeks

    return { totalUnits, totalLessons, assignedWeeks, unassignedWeeks }
  }, [plans])

  // --- Firestore 동기화: Progress ---

  useEffect(() => {
    const uid = getUid()
    if (!uid || progressFirestoreLoaded.current) return
    progressFirestoreLoaded.current = true

    async function loadProgress() {
      try {
        // Load all planProgress documents
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

  // --- Firestore 동기화: Overrides ---

  useEffect(() => {
    const uid = getUid()
    if (!uid || overridesFirestoreLoaded.current) return
    overridesFirestoreLoaded.current = true

    async function loadOverrides() {
      try {
        const docs = await getCollection(`users/${uid}/weeklyOverrides`)
        if (docs && docs.length > 0) {
          const merged = {}
          for (const doc of docs) {
            if (doc.id) merged[doc.id] = doc.data || doc
          }
          if (Object.keys(merged).length > 0) {
            setOverrides(merged)
          }
        }
      } catch (err) {
        console.warn('[useAnnualPlan] Overrides Firestore load failed:', err.message)
      }
    }

    loadOverrides()
  }, [])

  const syncOverridesToFirestore = useCallback((planId, data) => {
    const uid = getUid()
    if (uid) {
      setDocument(`users/${uid}/weeklyOverrides/${planId}`, data, false).catch((err) => {
        console.error('[useAnnualPlan] Overrides sync failed:', err)
      })
    }
  }, [])

  // --- 진도 추적 (Progress Tracking) ---

  /** 학급별 진도 조회 */
  const getClassProgress = useCallback((planId, classId) => {
    const plan = plans.find((p) => p.id === planId)
    if (!plan || plan.units.length === 0) return null

    const planProgress = progress[planId] || {}
    const cp = planProgress[classId] || { unitIndex: 0, lessonIndex: 0 }

    // 총 차시 수 계산
    const totalLessons = plan.units.reduce((sum, u) => sum + u.lessons.length, 0)
    if (totalLessons === 0) return null

    // 현재까지 완료한 차시 수
    let completedLessons = 0
    for (let i = 0; i < cp.unitIndex && i < plan.units.length; i++) {
      completedLessons += plan.units[i].lessons.length
    }
    completedLessons += cp.lessonIndex

    // 현재 단원/차시 정보
    const currentUnit = plan.units[cp.unitIndex]
    const currentLesson = currentUnit?.lessons?.[cp.lessonIndex]

    return {
      unitIndex: cp.unitIndex,
      lessonIndex: cp.lessonIndex,
      unitId: currentUnit?.id || null,
      unitTitle: currentUnit?.title || null,
      lessonNumber: currentLesson?.lesson || null,
      lessonTitle: currentLesson?.title || null,
      percent: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
    }
  }, [plans, progress])

  /** 현재 수업 차시 조회 */
  const getCurrentLesson = useCallback((planId, classId) => {
    const plan = plans.find((p) => p.id === planId)
    if (!plan || plan.units.length === 0) return null

    const planProgress = progress[planId] || {}
    const cp = planProgress[classId] || { unitIndex: 0, lessonIndex: 0 }

    const unit = plan.units[cp.unitIndex]
    if (!unit) return null

    const lesson = unit.lessons[cp.lessonIndex]
    if (!lesson) return null

    return { unit, lesson }
  }, [plans, progress])

  /** 진도 1차시 전진 */
  const advanceProgress = useCallback((planId, classId) => {
    const plan = plans.find((p) => p.id === planId)
    if (!plan || plan.units.length === 0) return null

    setProgress((prev) => {
      const planProgress = { ...(prev[planId] || {}) }
      const cp = planProgress[classId] || { unitIndex: 0, lessonIndex: 0 }

      const currentUnit = plan.units[cp.unitIndex]
      if (!currentUnit) return prev // 전체 완료

      let nextUnitIndex = cp.unitIndex
      let nextLessonIndex = cp.lessonIndex + 1

      // 현재 단원의 마지막 차시를 넘으면 다음 단원의 1차시로
      if (nextLessonIndex >= currentUnit.lessons.length) {
        nextUnitIndex += 1
        nextLessonIndex = 0
      }

      // 전체 완료 체크
      if (nextUnitIndex >= plan.units.length) {
        // 전체 완료 — 마지막 위치에 고정
        planProgress[classId] = {
          unitIndex: plan.units.length - 1,
          lessonIndex: plan.units[plan.units.length - 1].lessons.length,
        }
      } else {
        planProgress[classId] = {
          unitIndex: nextUnitIndex,
          lessonIndex: nextLessonIndex,
        }
      }

      const next = { ...prev, [planId]: planProgress }
      syncProgressToFirestore(planId, planProgress)
      return next
    })

    // 전진 후 다음 차시 정보 반환
    const planProgress = progress[planId] || {}
    const cp = planProgress[classId] || { unitIndex: 0, lessonIndex: 0 }
    const currentUnit = plan.units[cp.unitIndex]
    if (!currentUnit) return null

    let nextUnitIndex = cp.unitIndex
    let nextLessonIndex = cp.lessonIndex + 1
    if (nextLessonIndex >= currentUnit.lessons.length) {
      nextUnitIndex += 1
      nextLessonIndex = 0
    }
    if (nextUnitIndex >= plan.units.length) return null

    const nextUnit = plan.units[nextUnitIndex]
    const nextLesson = nextUnit?.lessons?.[nextLessonIndex]
    return nextLesson ? { unit: nextUnit, lesson: nextLesson } : null
  }, [plans, progress, setProgress, syncProgressToFirestore])

  // --- 주간 오버라이드 (Weekly Overrides) ---

  /** 특정 주의 오버라이드 조회 */
  const getWeeklyOverride = useCallback((planId, weekKey) => {
    return overrides[planId]?.[weekKey] || {}
  }, [overrides])

  /** 특정 셀에 수동 오버라이드 설정 */
  const setWeeklyOverride = useCallback((planId, weekKey, cellKey, data) => {
    setOverrides((prev) => {
      const planOverrides = { ...(prev[planId] || {}) }
      const weekOverrides = { ...(planOverrides[weekKey] || {}) }
      weekOverrides[cellKey] = {
        unitId: data.unitId,
        lessonNumber: data.lessonNumber,
        title: data.title,
      }
      planOverrides[weekKey] = weekOverrides

      const next = { ...prev, [planId]: planOverrides }
      syncOverridesToFirestore(planId, planOverrides)
      return next
    })
  }, [setOverrides, syncOverridesToFirestore])

  /** 특정 셀의 오버라이드 제거 */
  const clearWeeklyOverride = useCallback((planId, weekKey, cellKey) => {
    setOverrides((prev) => {
      const planOverrides = { ...(prev[planId] || {}) }
      const weekOverrides = { ...(planOverrides[weekKey] || {}) }
      delete weekOverrides[cellKey]

      if (Object.keys(weekOverrides).length === 0) {
        delete planOverrides[weekKey]
      } else {
        planOverrides[weekKey] = weekOverrides
      }

      const next = { ...prev, [planId]: planOverrides }
      syncOverridesToFirestore(planId, planOverrides)
      return next
    })
  }, [setOverrides, syncOverridesToFirestore])

  // --- 시간표 오버레이 (Schedule Overlay) ---

  /** 특정 주의 체육 교시에 차시 정보 매핑 */
  const getScheduleOverlay = useCallback((planId, classId, weekKey, baseTimetable) => {
    const plan = plans.find((p) => p.id === planId)
    if (!plan || !baseTimetable) return {}

    // 1. 해당 주의 체육 교시 셀 추출 (요일-교시 순서 유지)
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

    // 2. 학급 진도에서 현재 차시부터 순서대로 매핑
    const planProgress = progress[planId] || {}
    const cp = planProgress[classId] || { unitIndex: 0, lessonIndex: 0 }

    // 남은 차시들을 flat 리스트로 전개
    const remainingLessons = []
    for (let ui = cp.unitIndex; ui < plan.units.length; ui++) {
      const unit = plan.units[ui]
      const startLi = ui === cp.unitIndex ? cp.lessonIndex : 0
      for (let li = startLi; li < unit.lessons.length; li++) {
        remainingLessons.push({
          unitId: unit.id,
          unitTitle: unit.title,
          lessonNumber: unit.lessons[li].lesson,
          lessonTitle: unit.lessons[li].title,
        })
      }
    }

    // 3. 자동 매핑
    const overlay = {}
    for (let i = 0; i < peCells.length; i++) {
      const cellKey = peCells[i]
      if (i < remainingLessons.length) {
        overlay[cellKey] = remainingLessons[i]
      }
    }

    // 4. 주간 오버라이드 적용 (있으면 자동 매핑을 대체)
    const weekOverride = overrides[planId]?.[weekKey] || {}
    for (const [cellKey, data] of Object.entries(weekOverride)) {
      overlay[cellKey] = {
        unitId: data.unitId,
        lessonNumber: data.lessonNumber,
        title: data.title,
        unitTitle: data.unitTitle || '',
        isOverride: true,
      }
    }

    return overlay
  }, [plans, progress, overrides])

  /** 최종 병합: 자동 계산 + 오버라이드로 특정 셀의 수업 정보 */
  const getEffectiveLessonForCell = useCallback((planId, classId, weekKey, cellKey, baseTimetable) => {
    const overlay = getScheduleOverlay(planId, classId, weekKey, baseTimetable)
    return overlay[cellKey] || null
  }, [getScheduleOverlay])

  return {
    plans,
    getPlanByGrade,
    createPlan,
    deletePlan,

    addUnitFromTemplate,
    addCustomUnit,
    updateUnit,
    removeUnit,
    reorderUnits,

    updateLesson,
    addLesson,
    removeLesson,

    assignUnitWeeks,

    getDomainDistribution,
    getPlanSummary,

    // Progress tracking
    getClassProgress,
    getCurrentLesson,
    advanceProgress,

    // Schedule overlay
    getScheduleOverlay,

    // Weekly overrides
    getWeeklyOverride,
    setWeeklyOverride,
    clearWeeklyOverride,
    getEffectiveLessonForCell,
  }
}
