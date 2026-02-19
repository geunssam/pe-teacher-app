// 앱 루트 — React Router 설정, Auth 통합, 탭 레이아웃, ProtectedRoute(인증+학급설정 필수) | 탭메뉴→constants/navigation.jsx, 레이아웃→components/layout/
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom'
import { lazy, Suspense, useEffect, useState } from 'react'
import { Toaster } from 'react-hot-toast'
import { useClassManager } from './hooks/useClassManager'
import { AuthProvider, useAuthContext } from './contexts/AuthContext'
import Header from './components/layout/Header'
import AIChatPanel from './components/common/AIChatPanel'
import { useConfirm } from './components/common/ConfirmDialog'
import MigrationPrompt from './components/common/MigrationPrompt'
import ErrorBoundary from './components/common/ErrorBoundary'
import LoadingSpinner from './components/common/LoadingSpinner'

// 페이지 이동 시 스크롤을 최상단으로
function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}

// Lazy-loaded pages (코드 스플리팅)
const HomePage = lazy(() => import('./pages/HomePage'))
const WeatherPage = lazy(() => import('./pages/WeatherPage'))
const SchedulePage = lazy(() => import('./pages/SchedulePage'))
const RecommendPage = lazy(() => import('./pages/RecommendPage'))
const CurriculumPage = lazy(() => import('./pages/CurriculumPage'))
const ClassesPage = lazy(() => import('./pages/ClassesPage'))
const LibraryPage = lazy(() => import('./pages/LibraryPage'))
const SetupWizard = lazy(() => import('./pages/SetupWizard'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))

// 인증 보호 라우트 (로그인 필수) — /setup 전용
function AuthRoute({ children }) {
  const { user, loading } = useAuthContext()
  if (loading) return <LoadingSpinner />
  if (!user) return <Navigate to="/login" replace />
  return children
}

// 보호된 레이아웃 라우트 (인증 + 학급 설정 + 에러 바운더리 통합)
function ProtectedLayout() {
  const { user, loading } = useAuthContext()
  const { isSetupComplete, dataReady } = useClassManager()

  if (loading) return <LoadingSpinner />
  if (!user) return <Navigate to="/login" replace />
  if (!dataReady) return <LoadingSpinner />
  if (!isSetupComplete()) return <Navigate to="/setup" replace />

  return (
    <ErrorBoundary>
      <Outlet />
    </ErrorBoundary>
  )
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
        <ErrorBoundary>
          <AppContent />
        </ErrorBoundary>
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
  // (이미 마이그레이션 완료/건너뛴 경우 재표시하지 않음)
  useEffect(() => {
    if (user && isNewUser && !migrationChecked && hasLocalPEData()) {
      const migrationFlag = localStorage.getItem('pe_migrated_to_firestore')
      if (!migrationFlag) {
        setShowMigration(true)
      }
      setMigrationChecked(true)
    }
  }, [user, isNewUser, migrationChecked])

  // Show loading spinner during auth initialization
  if (loading && location.pathname !== '/login') {
    return <LoadingSpinner />
  }

  return (
    <div className="app-container">
      {/* 페이지 이동 시 스크롤 초기화 */}
      <ScrollToTop />

      {/* 헤더 + 네비게이션 (로그인/학급설정 페이지에서는 숨김) */}
      {shouldShowHeader && user && <Header />}

      {/* 메인 콘텐츠 */}
      <main className="main-content">
        <Suspense fallback={<LoadingSpinner />}>
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

            {/* 보호된 라우트들 (인증 + 학급 설정 + 에러 바운더리 통합) */}
            <Route element={<ProtectedLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/weather" element={<WeatherPage />} />
              <Route path="/schedule" element={<SchedulePage />} />
              <Route path="/recommend" element={<RecommendPage />} />
              <Route path="/curriculum" element={<CurriculumPage />} />
              <Route path="/classes" element={<ClassesPage />} />
              <Route path="/library" element={<LibraryPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Routes>
        </Suspense>
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
