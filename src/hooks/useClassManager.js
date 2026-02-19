// 학급담임 훅 (오케스트레이터) — 학급 CRUD + Firestore 로딩 + sub-hook 합성 | 사용처→ClassesPage/SchedulePage/HomePage
// 명단→useRosterManager, 기록→useRecordManager로 분리. 공개 API는 동일 유지.
import { useState, useCallback, useEffect, useRef } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../services/firebase'
import { useLocalStorage } from './useLocalStorage'
import { getUid } from './useDataSource'
import { setDocument, getDocument, getCollection, commitBatchChunked } from '../services/firestore'
import { generateClassId, generateStudentId } from '../utils/generateId'
import { sanitizeForFirestore, trimLargeFields } from '../utils/firestoreHelpers'
import { CLASS_COLOR_PRESETS } from '../constants/classColors'
import { useRosterManager } from './useRosterManager'
import { useRecordManager } from './useRecordManager'
import toast from 'react-hot-toast'

export { CLASS_COLOR_PRESETS } from '../constants/classColors'

export function useClassManager() {
  const [classSetup, setClassSetup] = useLocalStorage('pe_class_setup', null)
  const [classes, setClasses] = useLocalStorage('pe_classes', [])
  const [rosters, setRosters] = useLocalStorage('pe_rosters', {})
  const [records, setRecords] = useLocalStorage('pe_class_records', {})
  const firestoreLoaded = useRef(false)
  const [dataReady, setDataReady] = useState(false)

  // --- Firestore sync helpers ---
  const syncClassSetupToFirestore = useCallback((setup) => {
    const uid = getUid()
    if (uid) {
      setDocument(`users/${uid}`, { classSetup: setup }, true).catch((err) => {
        console.error('Failed to sync class setup:', err)
      })
    }
  }, [])

  const syncClassToFirestore = useCallback((classData) => {
    const uid = getUid()
    if (uid && classData?.id) {
      setDocument(`users/${uid}/classes/${classData.id}`, classData, false).catch((err) => {
        console.error('Failed to sync class:', err)
      })
    }
  }, [])

  const syncClassesToFirestore = useCallback((allClasses) => {
    const uid = getUid()
    if (!uid || !allClasses?.length) return
    const ops = allClasses.map((cls) => ({
      type: 'set',
      path: `users/${uid}/classes/${cls.id}`,
      data: cls,
    }))
    commitBatchChunked(ops).catch((err) => {
      console.error('Failed to batch sync classes:', err)
    })
  }, [])

  const syncRosterToFirestore = useCallback((classId, roster) => {
    const uid = getUid()
    if (!uid || !classId) return
    setDocument(`users/${uid}/classes/${classId}`, { roster }, true).catch((err) => {
      console.error('Failed to sync roster:', err)
    })
  }, [])

  const syncRecordsToFirestore = useCallback((classId, classRecords) => {
    const uid = getUid()
    if (!uid || !classId) return
    const trimmed = Array.isArray(classRecords) ? classRecords.slice(0, 50) : classRecords
    const sanitized = sanitizeForFirestore(trimmed.map(trimLargeFields))
    setDocument(`users/${uid}/classes/${classId}`, { records: sanitized }, true).catch((err) => {
      console.error('Failed to sync records:', err)
      toast.error('수업 기록 클라우드 동기화 실패')
    })
  }, [])

  // --- Compose sub-hooks ---
  const rosterManager = useRosterManager({
    rosters, setRosters, setClasses,
    syncRosterToFirestore, syncClassToFirestore,
  })

  const recordManager = useRecordManager({
    records, setRecords, setClasses,
    syncRecordsToFirestore, syncClassToFirestore,
  })

  // --- Firestore initial load ---
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
        const userDoc = await getDocument(`users/${user.uid}`)
        if (userDoc?.classSetup) {
          setClassSetup(userDoc.classSetup)
        }

        const classesDocs = await getCollection(`users/${user.uid}/classes`)
        if (classesDocs?.length) {
          const loadedClasses = []
          const loadedRosters = {}
          const loadedRecords = {}

          for (const classDoc of classesDocs) {
            const { roster, records: classRecords, id, ...classData } = classDoc
            loadedClasses.push({ id, ...classData })
            if (roster) loadedRosters[id] = roster
            if (classRecords) {
              const sorted = Array.isArray(classRecords)
                ? [...classRecords].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 50)
                : classRecords
              loadedRecords[id] = sorted
            }
          }

          if (loadedClasses.length) setClasses(loadedClasses)
          if (Object.keys(loadedRosters).length) setRosters(loadedRosters)
          if (Object.keys(loadedRecords).length) setRecords(loadedRecords)
        }
      } catch (err) {
        console.warn('[useClassManager] Firestore load failed, using localStorage:', err.message)
      } finally {
        setDataReady(true)
      }
    })
    return () => unsubscribe()
  }, [])

  // --- Class-level operations ---
  const initializeClasses = async (setup) => {
    const uid = getUid()
    if (uid) {
      try {
        const existingClasses = await getCollection(`users/${uid}/classes`)
        if (existingClasses.length > 0) {
          const deleteOps = existingClasses.map((cls) => ({
            type: 'delete',
            path: `users/${uid}/classes/${cls.id}`,
          }))
          await commitBatchChunked(deleteOps)
        }
      } catch (err) {
        console.warn('[useClassManager] Failed to delete existing classes:', err.message)
      }
    }

    const newClasses = []
    const newRosters = {}
    const newRecords = {}

    setup.grades.forEach((gradeInfo) => {
      const { grade, count, studentCounts } = gradeInfo
      for (let classNum = 1; classNum <= count; classNum++) {
        const classId = generateClassId()
        const studentCount = studentCounts ? studentCounts[classNum - 1] : 25

        newClasses.push({
          id: classId,
          grade,
          classNum,
          studentCount,
          color: CLASS_COLOR_PRESETS[(newClasses.length) % CLASS_COLOR_PRESETS.length],
          lastActivity: null,
          lastDomain: null,
          lastDate: null,
          createdAt: new Date().toISOString(),
        })

        newRosters[classId] = Array.from({ length: studentCount }, (_, index) => ({
          id: generateStudentId(),
          num: index + 1,
          name: '',
          gender: '',
          note: '',
        }))

        newRecords[classId] = []
      }
    })

    setClassSetup(setup)
    setClasses(newClasses)
    setRosters(newRosters)
    setRecords(newRecords)

    syncClassSetupToFirestore(setup)
    syncClassesToFirestore(newClasses)
    if (uid) {
      for (const cls of newClasses) {
        syncRosterToFirestore(cls.id, newRosters[cls.id])
      }
    }

    return { classes: newClasses, rosters: newRosters, records: newRecords }
  }

  const isSetupComplete = () => classSetup !== null && classes.length > 0

  const getClass = (classId) => classes.find((cls) => cls.id === classId) || null

  const updateClass = (classId, updates) => {
    setClasses((prev) => {
      const next = prev.map((cls) =>
        cls.id === classId ? { ...cls, ...updates, updatedAt: new Date().toISOString() } : cls
      )
      const updated = next.find((cls) => cls.id === classId)
      if (updated) syncClassToFirestore(updated)
      return next
    })
  }

  const getClassesByGrade = () => {
    const grouped = {}
    classes.forEach((cls) => {
      if (!grouped[cls.grade]) grouped[cls.grade] = []
      grouped[cls.grade].push(cls)
    })
    Object.keys(grouped).forEach((grade) => {
      grouped[grade].sort((a, b) => a.classNum - b.classNum)
    })
    return grouped
  }

  const getClassColor = (classId) => {
    const classInfo = classes.find((cls) => cls.id === classId)
    return classInfo?.color || CLASS_COLOR_PRESETS[0]
  }

  const setClassColor = (classId, color) => {
    setClasses((prev) => {
      const next = prev.map((cls) =>
        cls.id === classId ? { ...cls, color } : cls
      )
      const updated = next.find((cls) => cls.id === classId)
      if (updated) syncClassToFirestore(updated)
      return next
    })
  }

  const resetClassSetup = () => {
    setClassSetup(null)
    setClasses([])
    setRosters({})
    setRecords({})
    syncClassSetupToFirestore(null)
  }

  return {
    // 상태
    classSetup, classes, rosters, records, dataReady,

    // 초기화
    initializeClasses, isSetupComplete, resetClassSetup,

    // 조회 + 수정
    getClass, getClassesByGrade,

    // 색상 관리
    getClassColor, setClassColor,

    // 명단 관리 (from useRosterManager)
    ...rosterManager,

    // 기록 관리 (from useRecordManager)
    ...recordManager,
  }
}
