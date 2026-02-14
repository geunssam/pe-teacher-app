import { Link, useLocation, useNavigate } from 'react-router-dom'
import { NAV_ITEMS, SettingsIcon, LogoutIcon } from '../../constants/navigation'

export default function Header() {
  const location = useLocation()
  const navigate = useNavigate()

  const handleSettings = () => {
    navigate('/settings')
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

        {/* 우측: 설정 + 로그아웃 */}
        <div className="header-right">
          <button
            onClick={handleSettings}
            className="header-action-btn header-settings-btn"
            title="설정"
          >
            <SettingsIcon />
            <span className="hidden-mobile">설정</span>
          </button>

          <button className="header-action-btn header-logout-btn" title="로그아웃">
            <LogoutIcon />
            <span className="hidden-mobile">로그아웃</span>
          </button>
        </div>
      </div>
    </header>
  )
}
