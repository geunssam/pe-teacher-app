// 수업 기록 관리 훅 — 기록 CRUD + 차시 계산 + Firestore/Genkit 동기화 | 부모→useClassManager에서 compose
import { useCallback } from 'react'
import { generateRecordId } from '../utils/generateId'
import { toLocalDateString } from '../utils/recordDate'
import { sanitizeForFirestore } from '../utils/firestoreHelpers'
import { syncRecords as genkitSyncRecords } from '../services/genkit'

/**
 * @param {object} deps
 * @param {object} deps.records - 전체 기록 상태
 * @param {function} deps.setRecords - 기록 setter
 * @param {function} deps.setClasses - 학급 setter (lastActivity 등 업데이트용)
 * @param {function} deps.syncRecordsToFirestore - Firestore 기록 동기화
 * @param {function} deps.syncClassToFirestore - 학급 Firestore 동기화
 */
export function useRecordManager({ records, setRecords, setClasses, syncRecordsToFirestore, syncClassToFirestore }) {
  const getClassRecords = (classId) => {
    return records[classId] || []
  }

  const getClassRecordCount = (classId, domain = null) => {
    const classRecords = records[classId] || []
    if (!domain) return classRecords.length
    return classRecords.filter((record) => (record.domain || '스포츠') === domain).length
  }

  const getNextLessonSequence = (classId, domain = '스포츠') => {
    return getClassRecordCount(classId, domain) + 1
  }

  const addClassRecord = useCallback((classId, record) => {
    const now = new Date().toISOString()
    const normalizedDomain = record?.domain || '스포츠'
    const recordedAt = record?.recordedAt || toLocalDateString(record?.date)
    const classRecords = records[classId] || []
    const currentCount = normalizedDomain
      ? classRecords.filter((r) => (r.domain || '스포츠') === normalizedDomain).length
      : classRecords.length
    const nextSequence = record?.sequence
      ? Number(record.sequence)
      : currentCount + 1
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
      ...record,
      sequence: Number.isFinite(nextSequence) ? nextSequence : currentCount + 1,
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
    genkitSyncRecords([nextRecord]).catch(() => {})
  }, [records, setRecords, setClasses, syncRecordsToFirestore, syncClassToFirestore])

  const findRecordForCell = (classId, day, period, classDate) => {
    const classRecords = records[classId] || []
    if (!classRecords.length) return null

    const matches = classRecords.filter(
      (r) => r.day === day && r.period === period && r.classDate === classDate
    )

    if (!matches.length) return null
    if (matches.length === 1) return matches[0]

    return matches.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))[0]
  }

  return {
    getClassRecords,
    getClassRecordCount,
    getNextLessonSequence,
    addClassRecord,
    findRecordForCell,
  }
}
