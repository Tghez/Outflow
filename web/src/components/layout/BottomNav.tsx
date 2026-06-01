import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/', label: 'בית', icon: '🏠' },
  { to: '/transactions', label: 'תנועות', icon: '📋' },
  { to: '/insights', label: 'תובנות', icon: '📊' },
  { to: '/settings', label: 'הגדרות', icon: '⚙️' },
]

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 bg-brand-surface border-t border-brand-light/60 flex justify-around z-50">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/'}
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 py-2.5 px-4 text-xs font-semibold transition-colors ${
              isActive ? 'text-brand-accent' : 'text-brand-muted hover:text-brand-text'
            }`
          }
        >
          <span className="text-xl">{tab.icon}</span>
          <span>{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
