// 상단 탭바 — PEhub 핵심 4탭 네비게이션 (640px+) | 탭아이콘→constants/navigation.jsx, 스타일→css/components/navbar.css, 반응형→css/utilities/responsive.css
import { Link, useLocation } from 'react-router-dom'
import { NAV_ITEMS } from '../../constants/navigation'

export default function TopNav() {
  const location = useLocation()

  return (
    <nav className="top-nav">
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.path}
          to={item.path}
          className={`top-nav-item ${location.pathname === item.path ? 'active' : ''}`}
          data-tab={item.tab}
        >
          {`${item.emoji} ${item.label}`}
        </Link>
      ))}
    </nav>
  )
}
