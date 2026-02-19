// Firestore CRUD 헬퍼 — 문서 읽기/쓰기, 배치 처리, 디바운스 | 사용처→hooks/useClassManager, useSchedule, useSettings, useEditedAceLesson, useCurriculum
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  writeBatch,
  onSnapshot,
} from 'firebase/firestore'
import { db } from './firebase'

/**
 * Get a single document
 */
export async function getDocument(path) {
  const ref = doc(db, ...path.split('/'))
  const snap = await getDoc(ref)
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

/**
 * Set (create or overwrite) a document
 */
export async function setDocument(path, data, merge = true) {
  const ref = doc(db, ...path.split('/'))
  await setDoc(ref, data, { merge })
}

/**
 * Delete a single document
 */
export async function deleteDocument(path) {
  const ref = doc(db, ...path.split('/'))
  await deleteDoc(ref)
}

/**
 * Get all documents in a collection
 */
export async function getCollection(path) {
  const ref = collection(db, ...path.split('/'))
  const snap = await getDocs(ref)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

/**
 * Batch write with 500-chunk splitting (Firestore limit)
 * @param {Array<{ type: 'set'|'delete', path: string, data?: object }>} operations
 */
export async function commitBatchChunked(operations) {
  for (let i = 0; i < operations.length; i += 500) {
    const chunk = operations.slice(i, i + 500)
    const batch = writeBatch(db)

    for (const op of chunk) {
      const ref = doc(db, ...op.path.split('/'))
      if (op.type === 'set') {
        batch.set(ref, op.data, { merge: true })
      } else if (op.type === 'delete') {
        batch.delete(ref)
      }
    }

    await batch.commit()
  }
}

/**
 * Subscribe to a document with onSnapshot
 * @returns {function} unsubscribe
 */
export function subscribeDocument(path, callback) {
  const ref = doc(db, ...path.split('/'))
  return onSnapshot(ref, (snap) => {
    callback(snap.exists() ? { id: snap.id, ...snap.data() } : null)
  })
}

/**
 * Debounced write utility — delays writes to avoid excessive Firestore calls
 * Returns a function that, when called with (path, data), will debounce the write.
 */
export function createDebouncedWriter(delayMs = 1000) {
  const timers = new Map()

  return (path, data, merge = true) => {
    if (timers.has(path)) {
      clearTimeout(timers.get(path))
    }

    timers.set(
      path,
      setTimeout(async () => {
        timers.delete(path)
        try {
          await setDocument(path, data, merge)
        } catch (err) {
          console.error(`Debounced write failed for ${path}:`, err)
        }
      }, delayMs)
    )
  }
}
