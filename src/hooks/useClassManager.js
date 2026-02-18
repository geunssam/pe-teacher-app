// 학급담임 훅 — 학급 목록, 학생 명단, 수업 기록 CRUD (Firestore + localStorage fallback) | 사용처→ClassesPage/SchedulePage/HomePage
import { useState, useCallback, useEffect, useRef } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../services/firebase'
import { useLocalStorage } from './useLocalStorage'
import { getUid } from './useDataSource'
import { setDocument, getDocument, getCollection, commitBatchChunked } from '../services/firestore'
import { generateClassId, generateRecordId, generateStudentId } from '../utils/generateId'
import { syncRecords as genkitSyncRecords } from '../services/genkit'
import toast from 'react-hot-toast'

// Firestore 비호환 데이터 정제 (undefined → null, 순환 참조 제거)
function sanitizeForFirestore(obj) {
  return JSON.parse(JSON.stringify(obj, (_key, value) =>
    value === undefined ? null : value
  ))
}

// aceLesson 등 큰 객체 크기 제한 (직렬화 후 10KB 초과 시 주요 필드만)
function trimLargeFields(record) {
  if (!record.aceLesson) return record
  const serialized = JSON.stringify(record.aceLesson)
  if (serialized.length <= 10_000) return record
  // 주요 필드만 유지
  const { title, domain, sport, grade, activities, structure } = record.aceLesson
  return { ...record, aceLesson: { title, domain, sport, grade, activities, structure } }
}

/**
 * 학급 관리 Hook
 *
 * localStorage 스키마:
 * - pe_class_setup: { schoolLevel, grades: [{grade, count, studentCount}] }
 * - pe_classes: [{ id, grade, classNum, studentCount, color, ... }]
 * - pe_rosters: { classId: [{ id, num, name, gender, ... }] }
 *
 * Firestore paths:
 * - users/{uid} → { classSetup: { ... } }
 * - users/{uid}/classes/{classId} → { grade, classNum, studentCount, color, ... }
 * - users/{uid}/classes/{classId}/roster/{studentId} → { num, name, gender, note }
 * - users/{uid}/classes/{classId}/records/{recordId} → { date, activity, domain, ... }
 */

// 학급별 색상 프리셋
export const CLASS_COLOR_PRESETS = [
  { name: '분홍색', bg: '#FCE7F3', text: '#9F1239' },
  { name: '파란색', bg: '#DBEAFE', text: '#1E40AF' },
  { name: '초록색', bg: '#D1FAE5', text: '#065F46' },
  { name: '노란색', bg: '#FEF3C7', text: '#92400E' },
  { name: '보라색', bg: '#EDE9FE', text: '#5B21B6' },
  { name: '주황색', bg: '#FFEDD5', text: '#9A3412' },
  { name: '청록색', bg: '#CCFBF1', text: '#115E59' },
  { name: '빨간색', bg: '#FEE2E2', text: '#991B1B' },
]

const toLocalDateString = (value) => {
  if (!value) return ''

  if (value instanceof Date) {
    const year = value.getFullYear()
    const month = String(value.getMonth() + 1).padStart(2, '0')
    const day = String(value.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  if (typeof value === 'string') {
    return value.slice(0, 10)
  }

  const fallback = new Date(value)
  if (Number.isNaN(fallback.getTime())) {
    return ''
  }

  return toLocalDateString(fallback)
}

export function useClassManager() {
  const [classSetup, setClassSetup] = useLocalStorage('pe_class_setup', null)
  const [classes, setClasses] = useLocalStorage('pe_classes', [])
  const [rosters, setRosters] = useLocalStorage('pe_rosters', {})
  const [records, setRecords] = useLocalStorage('pe_class_records', {})
  const firestoreLoaded = useRef(false)
  const [dataReady, setDataReady] = useState(false)

  // Load from Firestore when auth state is resolved (onAuthStateChanged)
  // Fixes: 새로고침 시 localStorage 비어있으면 Firestore 로딩 전에 위저드로 리다이렉트되는 버그
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        // 비인증 상태 → localStorage만으로 판단
        setDataReady(true)
        return
      }

      if (firestoreLoaded.current) {
        setDataReady(true)
        return
      }
      firestoreLoaded.current = true

      try {
        // 1. Load classSetup from user document
        const userDoc = await getDocument(`users/${user.uid}`)
        if (userDoc?.classSetup) {
          setClassSetup(userDoc.classSetup)
        }

        // 2. Load classes collection
        const classesDocs = await getCollection(`users/${user.uid}/classes`)
        if (classesDocs?.length) {
          const loadedClasses = []
          const loadedRosters = {}
          const loadedRecords = {}

          for (const classDoc of classesDocs) {
            const { roster, records: classRecords, id, ...classData } = classDoc
            loadedClasses.push({ id, ...classData })

            if (roster) {
              loadedRosters[id] = roster
            }
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

  // Sync helpers for Firestore
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

    // Store roster as a single document for simplicity
    setDocument(`users/${uid}/classes/${classId}`, { roster }, true).catch((err) => {
      console.error('Failed to sync roster:', err)
    })
  }, [])

  const syncRecordsToFirestore = useCallback((classId, classRecords) => {
    const uid = getUid()
    if (!uid || !classId) return

    // 최근 50개만 Firestore에 저장 (localStorage는 전체 유지)
    const trimmed = Array.isArray(classRecords) ? classRecords.slice(0, 50) : classRecords
    // 큰 필드 축소 + Firestore 비호환 데이터 정제
    const sanitized = sanitizeForFirestore(trimmed.map(trimLargeFields))

    setDocument(`users/${uid}/classes/${classId}`, { records: sanitized }, true).catch((err) => {
      console.error('Failed to sync records:', err)
      toast.error('수업 기록 클라우드 동기화 실패')
    })
  }, [])

  /**
   * 학급 설정 초기화 (위저드 완료 시)
   * Firestore 기존 학급 삭제 후 새로 생성 (중복 방지)
   *
   * @param {object} setup - { schoolLevel, grades: [{grade, count, studentCounts: []}] }
   */
  const initializeClasses = async (setup) => {
    // 1. 기존 Firestore 학급 삭제 (중복 생성 방지)
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

    // 2. 새 학급 생성
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
          grade: grade,
          classNum: classNum,
          studentCount: studentCount,
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

    // 3. localStorage + Firestore 저장
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

  /**
   * 학급 설정이 완료되었는지 확인
   */
  const isSetupComplete = () => {
    return classSetup !== null && classes.length > 0
  }

  /**
   * 특정 학급 정보 가져오기
   */
  const getClass = (classId) => {
    return classes.find((cls) => cls.id === classId) || null
  }

  /**
   * 학급 정보 업데이트
   */
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

  /**
   * 특정 학급의 명단 가져오기
   */
  const getRoster = (classId) => {
    return rosters[classId] || []
  }

  /**
   * 특정 학급 수업 기록 조회
   */
  const getClassRecords = (classId) => {
    return records[classId] || []
  }

  /**
   * 특정 학급의 수업 기록 수 조회
   */
  const getClassRecordCount = (classId, domain = null) => {
    const classRecords = getClassRecords(classId)

    if (!domain) {
      return classRecords.length
    }

    return classRecords.filter((record) => (record.domain || '스포츠') === domain).length
  }

  /**
   * 특정 학급의 다음 차시 번호 계산
   */
  const getNextLessonSequence = (classId, domain = '스포츠') => {
    return getClassRecordCount(classId, domain) + 1
  }

  /**
   * 수업 기록 추가
   */
  const addClassRecord = (classId, record) => {
    const now = new Date().toISOString()
    const normalizedDomain = record?.domain || '스포츠'
    const recordedAt = record?.recordedAt || toLocalDateString(record?.date)
    const nextSequence = record?.sequence
      ? Number(record.sequence)
      : getNextLessonSequence(classId, normalizedDomain)
    const nextDate = (() => {
      if (!record?.date) return toLocalDateString(now)
      return toLocalDateString(record.date)
    })()

    const nextRecord = sanitizeForFirestore({
      id: record?.id || generateRecordId(),
      date: nextDate,
      recordedAt: recordedAt || nextDate,
      createdAt: now,
      classId,
      activity: '수업 활동',
      domain: '스포츠',
      sequence: nextSequence,
      ...record,
      sequence: Number.isFinite(nextSequence) ? nextSequence : getNextLessonSequence(classId, normalizedDomain),
      domain: normalizedDomain,
    })

    setRecords((prev) => {
      const next = {
        ...prev,
        [classId]: [nextRecord, ...(prev[classId] || [])],
      }
      syncRecordsToFirestore(classId, next[classId])
      return next
    })

    setClasses((prev) => {
      const next = prev.map((cls) =>
        cls.id === classId
          ? {
              ...cls,
              lastActivity: nextRecord.activity || cls.lastActivity,
              lastDomain: nextRecord.domain || cls.lastDomain,
              lastSequence: nextRecord.sequence || cls.lastSequence || 0,
              lastDate: nextRecord.date || cls.lastDate,
            }
          : cls
      )
      const updated = next.find((cls) => cls.id === classId)
      if (updated) syncClassToFirestore(updated)
      return next
    })

    // Fire-and-forget: sync to Genkit RAG index
    genkitSyncRecords([nextRecord]).catch(() => {
      // Genkit sync is best-effort, silently ignore failures
    })
  }

  /**
   * 학급별로 그룹핑된 데이터 가져오기
   */
  const getClassesByGrade = () => {
    const grouped = {}

    classes.forEach((cls) => {
      const gradeKey = cls.grade
      if (!grouped[gradeKey]) {
        grouped[gradeKey] = []
      }
      grouped[gradeKey].push(cls)
    })

    // 각 학년 내에서 반 번호순 정렬
    Object.keys(grouped).forEach((grade) => {
      grouped[grade].sort((a, b) => a.classNum - b.classNum)
    })

    return grouped
  }

  /**
   * 명단 업데이트
   */
  const updateRoster = (classId, newRoster) => {
    setRosters((prev) => {
      const next = { ...prev, [classId]: newRoster }
      syncRosterToFirestore(classId, newRoster)
      return next
    })
  }

  /**
   * 학생 추가
   */
  const addStudent = (classId) => {
    const roster = getRoster(classId)
    const newStudent = {
      id: generateStudentId(),
      num: roster.length + 1,
      name: '',
      gender: '',
      note: '',
    }

    const newRoster = [...roster, newStudent]
    updateRoster(classId, newRoster)

    // 학급의 studentCount도 업데이트
    setClasses((prev) => {
      const next = prev.map((cls) =>
        cls.id === classId
          ? { ...cls, studentCount: cls.studentCount + 1 }
          : cls
      )
      const updated = next.find((cls) => cls.id === classId)
      if (updated) syncClassToFirestore(updated)
      return next
    })
  }

  /**
   * 학생 삭제
   */
  const removeStudent = (classId, studentId) => {
    const roster = getRoster(classId)
    const updatedRoster = roster
      .filter((student) => student.id !== studentId)
      .map((student, index) => ({
        ...student,
        num: index + 1, // 번호 재정렬
      }))

    updateRoster(classId, updatedRoster)

    // 학급의 studentCount도 업데이트
    setClasses((prev) => {
      const next = prev.map((cls) =>
        cls.id === classId
          ? { ...cls, studentCount: updatedRoster.length }
          : cls
      )
      const updated = next.find((cls) => cls.id === classId)
      if (updated) syncClassToFirestore(updated)
      return next
    })
  }

  /**
   * 학생 정보 업데이트
   */
  const updateStudent = (classId, studentId, updates) => {
    const roster = getRoster(classId)
    const updatedRoster = roster.map((student) =>
      student.id === studentId ? { ...student, ...updates } : student
    )

    updateRoster(classId, updatedRoster)
  }

  /**
   * 일괄 명단 입력 (줄바꿈 구분)
   */
  const bulkImportRoster = (classId, namesText) => {
    const names = namesText
      .split(/[\n,]/) // 줄바꿈 또는 쉼표로 분리
      .map((name) => name.trim())
      .filter((name) => name.length > 0)

    const roster = getRoster(classId)
    const updatedRoster = names.map((name, index) => {
      // 기존 학생이 있으면 이름만 업데이트, 없으면 새로 생성
      const existingStudent = roster[index]

      if (existingStudent) {
        return { ...existingStudent, name }
      } else {
        return {
          id: generateStudentId(),
          num: index + 1,
          name,
          gender: '',
          note: '',
        }
      }
    })

    updateRoster(classId, updatedRoster)

    // 학생 수가 변경되었으면 학급 정보도 업데이트
    if (updatedRoster.length !== roster.length) {
      setClasses((prev) => {
        const next = prev.map((cls) =>
          cls.id === classId
            ? { ...cls, studentCount: updatedRoster.length }
            : cls
        )
        const updated = next.find((cls) => cls.id === classId)
        if (updated) syncClassToFirestore(updated)
        return next
      })
    }
  }

  /**
   * 학급 설정 재설정 (모든 데이터 삭제)
   */
  const resetClassSetup = () => {
    setClassSetup(null)
    setClasses([])
    setRosters({})
    setRecords({})
    syncClassSetupToFirestore(null)
  }

  /**
   * 학급 색상 가져오기
   */
  const getClassColor = (classId) => {
    const classInfo = classes.find((cls) => cls.id === classId)
    return classInfo?.color || CLASS_COLOR_PRESETS[0]
  }

  /**
   * 학급 색상 변경
   */
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

  /**
   * 특정 셀(요일+교시+날짜)에 해당하는 수업 기록 찾기
   * 여러 개면 가장 최신(createdAt 기준) 반환
   *
   * @param {string} classId
   * @param {string} day - 요일 키 (mon, tue, ...)
   * @param {number} period - 교시 번호
   * @param {string} classDate - YYYY-MM-DD 형식
   * @returns {object|null} 가장 최근 기록 또는 null
   */
  const findRecordForCell = (classId, day, period, classDate) => {
    const classRecords = getClassRecords(classId)
    if (!classRecords.length) return null

    const matches = classRecords.filter(
      (r) => r.day === day && r.period === period && r.classDate === classDate
    )

    if (!matches.length) return null
    if (matches.length === 1) return matches[0]

    // 여러 개면 가장 최신
    return matches.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))[0]
  }

  return {
    // 상태
    classSetup,
    classes,
    rosters,
    records,
    dataReady,

    // 초기화
    initializeClasses,
    isSetupComplete,
    resetClassSetup,

    // 조회
    getClass,
    updateClass,
    getRoster,
    getClassRecords,
    getClassRecordCount,
    getNextLessonSequence,
    addClassRecord,
    getClassesByGrade,
    findRecordForCell,

    // 색상 관리
    getClassColor,
    setClassColor,
    CLASS_COLOR_PRESETS,

    // 명단 관리
    updateRoster,
    addStudent,
    removeStudent,
    updateStudent,
    bulkImportRoster,
  }
}
