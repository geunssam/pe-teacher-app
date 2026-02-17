// Firebase 앱 초기화 — Auth + Firestore | 사용처→auth.js, firestore.js, hooks/useAuth.js
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyDhbGUEg848r7iJMWWIZJZ-iAkSamrsGb8',
  authDomain: 'pe-today-whatpe.firebaseapp.com',
  projectId: 'pe-today-whatpe',
  storageBucket: 'pe-today-whatpe.firebasestorage.app',
  messagingSenderId: '971426300945',
  appId: '1:971426300945:web:599770ed0d2a5e5cedddb0',
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
})

export default app
