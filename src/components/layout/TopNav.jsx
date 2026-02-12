import { Link, useLocation } from 'react-router-dom'

const NAV_ITEMS = [
  { path: '/', label: '🏠 오늘', tab: 'home' },
  { path: '/weather', label: '🌤️ 날씨', tab: 'weather' },
  { path: '/schedule', label: '📅 시간표', tab: 'schedule' },
  { path: '/sketch', label: '✏️ 수업스케치', tab: 'sketch' },
  { path: '/classes', label: '📋 학급', tab: 'classes' },
]

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
          {item.label}
        </Link>
      ))}
    </nav>
  )
}
