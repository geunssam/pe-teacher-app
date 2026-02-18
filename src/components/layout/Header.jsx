// 상단 헤더 — 앱 제목 + 현재 탭 표시 | 탭아이콘→constants/navigation.jsx, 스타일→css/components/navbar.css
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { NAV_ITEMS, SettingsIcon, LogoutIcon } from '../../constants/navigation'
import { useAuthContext } from '../../contexts/AuthContext'
import { confirm } from '../common/ConfirmDialog'
import toast from 'react-hot-toast'

export default function Header() {
  const location = useLocation()
  const navigate = useNavigate()
  const { logout } = useAuthContext()

  const handleSettings = () => {
    navigate('/settings')
  }

  const handleLogout = async () => {
    const confirmed = await confirm('로그아웃하시겠습니까?', '로그아웃', '취소')
    if (confirmed) {
      await logout()
      toast.success('로그아웃되었습니다')
    }
  }

  return (
    <header className="app-header">
      <div className="header-container">
        {/* 좌측: 로고 */}
        <div className="header-left">
          <div className="app-logo">
            <img src="/icon-192.png" alt="PEhub" width="28" height="28" style={{ borderRadius: '6px' }} />
            <span className="app-logo-text">PEhub</span>
          </div>
        </div>

        {/* 중앙: 메인 네비게이션 (PEhub 핵심 4개 탭) */}
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

          <button onClick={handleLogout} className="header-action-btn header-logout-btn" title="로그아웃">
            <LogoutIcon />
            <span className="hidden-mobile">로그아웃</span>
          </button>
        </div>
      </div>
    </header>
  )
}
