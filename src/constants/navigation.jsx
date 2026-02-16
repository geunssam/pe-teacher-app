// 탭 메뉴 아이콘 + NAV_ITEMS 정의 — PEhub 핵심 4탭 공용 상수
export const HomeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
    <polyline points="9 22 9 12 15 12 15 22"></polyline>
  </svg>
)

export const WeatherIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"></path>
    <circle cx="12" cy="12" r="4"></circle>
  </svg>
)

export const CalendarIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
)

export const UsersIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
)

export const SettingsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"></circle>
    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"></path>
  </svg>
)

export const LogoutIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
    <polyline points="16 17 21 12 16 7"></polyline>
    <line x1="21" y1="12" x2="9" y2="12"></line>
  </svg>
)

export const LibraryIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
    <line x1="8" y1="7" x2="16" y2="7"></line>
    <line x1="8" y1="11" x2="13" y2="11"></line>
  </svg>
)

export const CurriculumIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="3.2" width="10.9" height="17.6" rx="1.6" />
    <rect x="15.5" y="3.2" width="1.1" height="17.6" rx="0.5" fill="currentColor" fillOpacity="0.24" stroke="none" />
    <line x1="15.9" y1="3.2" x2="15.9" y2="20.8" />
    <line x1="15.55" y1="4.35" x2="15.55" y2="5.1" />
    <line x1="15.55" y1="18.7" x2="15.55" y2="19.45" />
    <path d="M7.9 17.35l1.55-1.55 1.55 1.55 1.55-1.55 1.55 1.55" />
    <path d="M7.9 4.5h6.2" strokeWidth="1.25" />
    <circle cx="3.35" cy="7.35" r="1.05" fill="currentColor" fillOpacity="0.16" strokeWidth="0.9" />
    <circle cx="3.35" cy="11.85" r="1.05" fill="currentColor" fillOpacity="0.16" strokeWidth="0.9" />
    <circle cx="3.35" cy="16.35" r="1.05" fill="currentColor" fillOpacity="0.16" strokeWidth="0.9" />
  </svg>
  )

// Navigation items shared across Header, TopNav, HamburgerMenu
export const NAV_ITEMS = [
  { path: '/', label: '오늘', emoji: '🏠', icon: HomeIcon, tab: 'home' },
  { path: '/weather', label: '날씨', emoji: '🌤️', icon: WeatherIcon, tab: 'weather' },
  { path: '/schedule', label: '시간표', emoji: '📅', icon: CalendarIcon, tab: 'schedule' },
  { path: '/curriculum', label: '수업 설계', emoji: '📚', icon: CurriculumIcon, tab: 'curriculum' },
  { path: '/classes', label: '학급', emoji: '📋', icon: UsersIcon, tab: 'classes' },
  { path: '/library', label: '자료실', emoji: '📦', icon: LibraryIcon, tab: 'library' },
]
