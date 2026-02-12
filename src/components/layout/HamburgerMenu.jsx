import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'

const NAV_ITEMS = [
  { path: '/', label: '🏠 오늘', tab: 'home' },
  { path: '/weather', label: '🌤️ 날씨', tab: 'weather' },
  { path: '/schedule', label: '📅 시간표', tab: 'schedule' },
  { path: '/sketch', label: '✏️ 수업스케치', tab: 'sketch' },
  { path: '/classes', label: '📋 학급', tab: 'classes' },
]

export default function HamburgerMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const handleToggle = (e) => {
      setIsOpen(e.detail)
    }

    window.addEventListener('toggleMenu', handleToggle)
    return () => window.removeEventListener('toggleMenu', handleToggle)
  }, [])

  const closeMenu = () => {
    setIsOpen(false)
    window.dispatchEvent(new CustomEvent('toggleMenu', { detail: false }))
  }

  return (
    <>
      {/* 오버레이 */}
      <div
        className={`menu-overlay ${isOpen ? 'visible' : ''}`}
        onClick={closeMenu}
      />

      {/* 슬라이드 메뉴 */}
      <aside className={`slide-menu ${isOpen ? 'open' : ''}`}>
        <div className="slide-menu-header">
          <h2 className="slide-menu-title">메뉴</h2>
        </div>

        <nav className="slide-menu-nav">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`slide-menu-item ${location.pathname === item.path ? 'active' : ''}`}
              data-tab={item.tab}
              onClick={closeMenu}
            >
              <span className="slide-menu-icon">{item.label.split(' ')[0]}</span>
              <span>{item.label.split(' ').slice(1).join(' ')}</span>
            </Link>
          ))}
        </nav>
      </aside>
    </>
  )
}
