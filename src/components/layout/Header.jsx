import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useClassManager } from '../../hooks/useClassManager'
import toast from 'react-hot-toast'

// SVG 아이콘 컴포넌트들
const HomeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
    <polyline points="9 22 9 12 15 12 15 22"></polyline>
  </svg>
)

const WeatherIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"></path>
    <circle cx="12" cy="12" r="4"></circle>
  </svg>
)

const CalendarIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
)

const PencilIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
  </svg>
)

const UsersIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
)

const SettingsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"></circle>
    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"></path>
  </svg>
)

const LogoutIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
    <polyline points="16 17 21 12 16 7"></polyline>
    <line x1="21" y1="12" x2="9" y2="12"></line>
  </svg>
)

const NAV_ITEMS = [
  { path: '/', label: '오늘', icon: HomeIcon, tab: 'home' },
  { path: '/weather', label: '날씨', icon: WeatherIcon, tab: 'weather' },
  { path: '/schedule', label: '시간표', icon: CalendarIcon, tab: 'schedule' },
  { path: '/sketch', label: '수업스케치', icon: PencilIcon, tab: 'sketch' },
  { path: '/classes', label: '학급', icon: UsersIcon, tab: 'classes' },
]

export default function Header() {
  const location = useLocation()
  const navigate = useNavigate()
  const { resetClassSetup } = useClassManager()

  // TODO: 실제 학급 데이터에서 가져오기
  const currentClass = null // 예: "6학년 3반"

  const handleSettings = () => {
    const confirmed = window.confirm(
      '학급 설정을 다시 하시겠습니까?\n기존 데이터는 모두 삭제됩니다.'
    )

    if (confirmed) {
      resetClassSetup()
      toast.success('학급 설정이 초기화되었습니다')
      navigate('/setup')
    }
  }

  return (
    <header className="app-header">
      <div className="header-container">
        {/* 좌측: 로고 */}
        <div className="header-left">
          <div className="app-logo">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="5"></circle>
              <line x1="12" y1="1" x2="12" y2="3"></line>
              <line x1="12" y1="21" x2="12" y2="23"></line>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
              <line x1="1" y1="12" x2="3" y2="12"></line>
              <line x1="21" y1="12" x2="23" y2="12"></line>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            </svg>
            <span className="app-logo-text">오늘 체육 뭐하지?</span>
          </div>
        </div>

        {/* 중앙: 메인 네비게이션 (5개 탭) */}
        <nav className="main-nav">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-item ${isActive ? 'active' : ''}`}
                data-tab={item.tab}
              >
                <Icon />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* 우측: 학급명 + 설정 + 로그아웃 */}
        <div className="header-right">
          {currentClass && (
            <div className="current-class">
              <UsersIcon />
              <span>{currentClass}</span>
            </div>
          )}

          <button
            onClick={handleSettings}
            className="header-action-btn"
            title="설정"
          >
            <SettingsIcon />
            <span className="hidden-mobile">설정</span>
          </button>

          <button className="header-action-btn" title="로그아웃">
            <LogoutIcon />
            <span className="hidden-mobile">로그아웃</span>
          </button>
        </div>
      </div>
    </header>
  )
}
