// 앱 루트 — React Router 설정, Auth 통합, 탭 레이아웃, ProtectedRoute(인증+학급설정 필수) | 탭메뉴→constants/navigation.jsx, 레이아웃→components/layout/
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Toaster } from 'react-hot-toast'
import { useClassManager } from './hooks/useClassManager'
import { AuthProvider, useAuthContext } from './contexts/AuthContext'
import Header from './components/layout/Header'
import AIChatPanel from './components/common/AIChatPanel'
import { useConfirm } from './components/common/ConfirmDialog'
import MigrationPrompt from './components/common/MigrationPrompt'

// 페이지 이동 시 스크롤을 최상단으로
function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}

// Pages
import HomePage from './pages/HomePage'
import WeatherPage from './pages/WeatherPage'
import SchedulePage from './pages/SchedulePage'
import CurriculumPage from './pages/CurriculumPage'

import ClassesPage from './pages/ClassesPage'
import LibraryPage from './pages/LibraryPage'
import SetupWizard from './pages/SetupWizard'
import SettingsPage from './pages/SettingsPage'
import LoginPage from './pages/LoginPage'

// 인증 보호 라우트 (로그인 필수)
function AuthRoute({ children }) {
  const { user, loading } = useAuthContext()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-textMuted">로딩 중...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}

// 보호된 라우트 (학급 설정 필요 — Firestore 로딩 완료 대기)
function ProtectedRoute({ children }) {
  const { isSetupComplete, dataReady } = useClassManager()

  // Firestore 데이터 로딩 완료 전에는 스피너 표시 (위저드 오리다이렉트 방지)
  if (!dataReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary
             rounded-full animate-spin mx-auto" />
      </div>
    )
  }

  if (!isSetupComplete()) {
    return <Navigate to="/setup" replace />
  }

  return children
}

function App() {
  return (
    <AuthProvider>
      <Router
        basename={import.meta.env.BASE_URL}
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <AppContent />
      </Router>
    </AuthProvider>
  )
}

// localStorage에 기존 PE 데이터가 있는지 확인
function hasLocalPEData() {
  const keys = ['pe_classes', 'pe_timetable_base', 'pe_class_records', 'pe_rosters', 'pe-teacher-settings']
  return keys.some((key) => {
    const val = localStorage.getItem(key)
    return val && val !== '[]' && val !== '{}' && val !== 'null'
  })
}

function AppContent() {
  const location = useLocation()
  const { ConfirmDialog } = useConfirm()
  const { user, loading, isNewUser } = useAuthContext()
  const [showMigration, setShowMigration] = useState(false)
  const [migrationChecked, setMigrationChecked] = useState(false)
  const shouldShowHeader = location.pathname !== '/setup' && location.pathname !== '/login'

  // 신규 사용자 + localStorage 데이터 있으면 마이그레이션 프롬프트 표시
  useEffect(() => {
    if (user && isNewUser && !migrationChecked && hasLocalPEData()) {
      setShowMigration(true)
      setMigrationChecked(true)
    }
  }, [user, isNewUser, migrationChecked])

  // Show loading spinner during auth initialization
  if (loading && location.pathname !== '/login') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-textMuted">로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="app-container">
      {/* 페이지 이동 시 스크롤 초기화 */}
      <ScrollToTop />

      {/* 헤더 + 네비게이션 (로그인/학급설정 페이지에서는 숨김) */}
      {shouldShowHeader && user && <Header />}

      {/* 메인 콘텐츠 */}
      <main className="main-content">
        <Routes>
          {/* 로그인 페이지 */}
          <Route path="/login" element={
            user ? <Navigate to="/" replace /> : <LoginPage />
          } />

          {/* 학급 설정 위저드 */}
          <Route path="/setup" element={
            <AuthRoute>
              <SetupWizard />
            </AuthRoute>
          } />

          {/* 보호된 라우트들 */}
          <Route
            path="/"
            element={
              <AuthRoute>
                <ProtectedRoute>
                  <HomePage />
                </ProtectedRoute>
              </AuthRoute>
            }
          />
          <Route
            path="/weather"
            element={
              <AuthRoute>
                <ProtectedRoute>
                  <WeatherPage />
                </ProtectedRoute>
              </AuthRoute>
            }
          />
          <Route
            path="/schedule"
            element={
              <AuthRoute>
                <ProtectedRoute>
                  <SchedulePage />
                </ProtectedRoute>
              </AuthRoute>
            }
          />
          <Route
            path="/curriculum"
            element={
              <AuthRoute>
                <ProtectedRoute>
                  <CurriculumPage />
                </ProtectedRoute>
              </AuthRoute>
            }
          />

          <Route
            path="/classes"
            element={
              <AuthRoute>
                <ProtectedRoute>
                  <ClassesPage />
                </ProtectedRoute>
              </AuthRoute>
            }
          />
          <Route
            path="/library"
            element={
              <AuthRoute>
                <ProtectedRoute>
                  <LibraryPage />
                </ProtectedRoute>
              </AuthRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <AuthRoute>
                <ProtectedRoute>
                  <SettingsPage />
                </ProtectedRoute>
              </AuthRoute>
            }
          />
        </Routes>
      </main>

      {/* 마이그레이션 프롬프트 (신규 로그인 + 기존 localStorage 데이터 존재 시) */}
      {showMigration && user && (
        <MigrationPrompt
          uid={user.uid}
          onComplete={() => setShowMigration(false)}
        />
      )}

      {/* Toast 알림 */}
      <Toaster
        position="bottom-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'linear-gradient(145deg, rgba(255,255,255,0.9), rgba(255,255,255,0.7))',
            color: '#2D3748',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.6)',
            borderRadius: '16px',
            padding: '16px',
            fontSize: '14px',
            fontWeight: '600',
          },
        }}
      />

      {/* Confirm 다이얼로그 */}
      <ConfirmDialog />

      {/* 글로벌 AI 채팅 (로그인 후에만 표시) */}
      {user && <AIChatPanel />}
    </div>
  )
}

export default App
