// 모바일 메뉴 — 햄버거 버튼 → 좌측 슬라이드 메뉴 (<640px) | 탭아이콘→constants/navigation.jsx, 스타일→css/components/navbar.css
import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { NAV_ITEMS } from '../../constants/navigation'

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
              <span className="slide-menu-icon">{item.emoji}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>
    </>
  )
}
