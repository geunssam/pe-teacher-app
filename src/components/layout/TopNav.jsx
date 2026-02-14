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
