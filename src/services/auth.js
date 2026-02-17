// Firebase Auth 서비스 — Google 로그인/로그아웃, Firestore 유저 문서 관리, 계정 삭제 | 사용처→hooks/useAuth.js
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  deleteUser,
} from 'firebase/auth'
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  getDocs,
  writeBatch,
} from 'firebase/firestore'
import { auth, db } from './firebase'

const googleProvider = new GoogleAuthProvider()

/**
 * Google 로그인
 */
export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider)
  return result.user
}

/**
 * 로그아웃
 */
export async function signOutUser() {
  await signOut(auth)
}

/**
 * 로그인 시 Firestore 유저 문서 확인/생성
 * @param {import('firebase/auth').User} firebaseUser
 * @returns {{ isNewUser: boolean }}
 */
export async function onUserLogin(firebaseUser) {
  try {
    const userRef = doc(db, 'users', firebaseUser.uid)
    const userSnap = await getDoc(userRef)

    if (!userSnap.exists()) {
      // New user: create doc
      await setDoc(userRef, {
        displayName: firebaseUser.displayName || '',
        email: firebaseUser.email || '',
        photoURL: firebaseUser.photoURL || '',
        nickname: null,
        schoolLevel: null,
        grades: [],
        settings: {
          location: {
            name: '학교 이름',
            address: null,
            lat: 36.3504,
            lon: 127.3845,
            stationName: '대전',
          },
        },
        setupCompletedAt: null,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
      })
      console.log('[Auth] New user document created:', firebaseUser.uid)
      return { isNewUser: true }
    }

    // Existing user: update lastLoginAt
    await setDoc(userRef, { lastLoginAt: serverTimestamp() }, { merge: true })
    console.log('[Auth] Existing user login:', firebaseUser.uid)
    return { isNewUser: false }
  } catch (err) {
    console.error('[Auth] onUserLogin failed:', err.code, err.message)
    throw err
  }
}

/**
 * 계정 삭제 — Firestore 유저 데이터 삭제 후 Auth 계정 삭제
 */
export async function deleteUserAccount() {
  const user = auth.currentUser
  if (!user) throw new Error('No authenticated user')

  const uid = user.uid

  // Delete all subcollections under users/{uid}
  const subcollections = ['classes', 'editedLessons', 'myActivities', 'curriculum', 'savedActivities']

  for (const sub of subcollections) {
    const colRef = collection(db, 'users', uid, sub)
    const snap = await getDocs(colRef)

    if (snap.empty) continue

    // Batch delete in chunks of 500
    const docs = snap.docs
    for (let i = 0; i < docs.length; i += 500) {
      const batch = writeBatch(db)
      const chunk = docs.slice(i, i + 500)
      chunk.forEach((d) => batch.delete(d.ref))
      await batch.commit()
    }
  }

  // Delete schedule subcollection docs
  const scheduleSubcols = ['base', 'weeks']
  for (const sub of scheduleSubcols) {
    const scheduleDocRef = doc(db, 'users', uid, 'schedule', sub)
    const scheduleSnap = await getDoc(scheduleDocRef)
    if (scheduleSnap.exists()) {
      const batch = writeBatch(db)
      batch.delete(scheduleDocRef)
      await batch.commit()
    }
  }

  // Delete user document
  const userRef = doc(db, 'users', uid)
  const batch = writeBatch(db)
  batch.delete(userRef)
  await batch.commit()

  // Delete Firebase Auth account
  await deleteUser(user)
}
