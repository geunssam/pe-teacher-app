import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Header from './components/layout/Header'

// Pages
import HomePage from './pages/HomePage'
import WeatherPage from './pages/WeatherPage'
import SchedulePage from './pages/SchedulePage'
import SketchPage from './pages/SketchPage'
import ClassesPage from './pages/ClassesPage'

function App() {
  return (
    <Router>
      <div className="app-container">
        {/* 헤더 + 네비게이션 */}
        <Header />

        {/* 메인 콘텐츠 */}
        <main className="main-content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/weather" element={<WeatherPage />} />
            <Route path="/schedule" element={<SchedulePage />} />
            <Route path="/sketch" element={<SketchPage />} />
            <Route path="/classes" element={<ClassesPage />} />
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
    </Router>
  )
}

export default App
