import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useClassManager } from './hooks/useClassManager'
import Header from './components/layout/Header'

// Pages
import HomePage from './pages/HomePage'
import WeatherPage from './pages/WeatherPage'
import SchedulePage from './pages/SchedulePage'
import SketchPage from './pages/SketchPage'
import ClassesPage from './pages/ClassesPage'
import SetupWizard from './pages/SetupWizard'

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
    <Router>
      <AppContent />
    </Router>
  )
}

function AppContent() {
  const { isSetupComplete } = useClassManager()
  const setupComplete = isSetupComplete()

  return (
    <div className="app-container">
      {/* 헤더 + 네비게이션 (학급 설정 페이지에서는 숨김) */}
      {setupComplete && <Header />}

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
    </div>
  )
}

export default App
