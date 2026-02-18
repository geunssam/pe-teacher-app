// 상단 헤더 — 앱 제목 + 네비게이션 + 프로필 드롭다운 | 탭아이콘→constants/navigation.jsx, 스타일→css/components/navbar.css
import { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { NAV_ITEMS, SettingsIcon, LogoutIcon } from '../../constants/navigation'
import { useAuthContext } from '../../contexts/AuthContext'
import { useSettings } from '../../hooks/useSettings'
import { confirm } from '../common/ConfirmDialog'
import toast from 'react-hot-toast'

export default function Header() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuthContext()
  const { nickname } = useSettings()
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef(null)

  // 바깥 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showDropdown])

  const handleSettings = () => {
    setShowDropdown(false)
    navigate('/settings')
  }

  const handleLogout = async () => {
    setShowDropdown(false)
    const confirmed = await confirm('로그아웃하시겠습니까?', '로그아웃', '취소')
    if (confirmed) {
      await logout()
      toast.success('로그아웃되었습니다')
    }
  }

  const displayName = nickname || user?.displayName || '선생님'
  const photoURL = user?.photoURL

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

        {/* 중앙: 메인 네비게이션 */}
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

        {/* 우측: 프로필 */}
        <div className="header-right" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown((v) => !v)}
            className="profile-trigger"
          >
            {photoURL ? (
              <img
                src={photoURL}
                alt=""
                className="profile-avatar"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="profile-avatar-fallback">
                {displayName.charAt(0)}
              </div>
            )}
            <span className="profile-name">{displayName}</span>
          </button>

          {/* 드롭다운 메뉴 */}
          {showDropdown && (
            <div className="profile-dropdown">
              <div className="profile-dropdown-header">
                {photoURL && (
                  <img
                    src={photoURL}
                    alt=""
                    className="profile-dropdown-avatar"
                    referrerPolicy="no-referrer"
                  />
                )}
                <div className="profile-dropdown-info">
                  <span className="profile-dropdown-name">{displayName}</span>
                  {user?.email && (
                    <span className="profile-dropdown-email">{user.email}</span>
                  )}
                </div>
              </div>

              <div className="profile-dropdown-divider" />

              <button onClick={handleSettings} className="profile-dropdown-item">
                <SettingsIcon />
                <span>설정</span>
              </button>
              <button onClick={handleLogout} className="profile-dropdown-item profile-dropdown-logout">
                <LogoutIcon />
                <span>로그아웃</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
