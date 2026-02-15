// 앱 루트 — React Router 설정, 탭 레이아웃, ProtectedRoute(학급설정 필수) | 탭메뉴→constants/navigation.jsx, 레이아웃→components/layout/
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { useClassManager } from './hooks/useClassManager'
import Header from './components/layout/Header'
import { useConfirm } from './components/common/ConfirmDialog'

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
import SketchPage from './pages/SketchPage'
import ClassesPage from './pages/ClassesPage'
import SetupWizard from './pages/SetupWizard'
import SettingsPage from './pages/SettingsPage'
import CurriculumPage from './pages/CurriculumPage'

// 보호된 라우트 (학급 설정 필요)
function ProtectedRoute({ children }) {
  const { isSetupComplete } = useClassManager()

  if (!isSetupComplete()) {
    return <Navigate to="/setup" replace />
  }

  return children
}

function App() {
  return (
    <Router
      basename={import.meta.env.BASE_URL}
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <AppContent />
    </Router>
  )
}

function AppContent() {
  const location = useLocation()
  const { ConfirmDialog } = useConfirm()
  const shouldShowHeader = location.pathname !== '/setup'

  return (
    <div className="app-container">
      {/* 페이지 이동 시 스크롤 초기화 */}
      <ScrollToTop />

      {/* 헤더 + 네비게이션 (학급 설정 페이지에서는 숨김) */}
      {shouldShowHeader && <Header />}

      {/* 메인 콘텐츠 */}
      <main className="main-content">
        <Routes>
          {/* 학급 설정 위저드 */}
          <Route path="/setup" element={<SetupWizard />} />

          {/* 보호된 라우트들 */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/weather"
            element={
              <ProtectedRoute>
                <WeatherPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/schedule"
            element={
              <ProtectedRoute>
                <SchedulePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sketch"
            element={
              <ProtectedRoute>
                <SketchPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/classes"
            element={
              <ProtectedRoute>
                <ClassesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/curriculum"
            element={
              <ProtectedRoute>
                <CurriculumPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>

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
    </div>
  )
}

export default App
