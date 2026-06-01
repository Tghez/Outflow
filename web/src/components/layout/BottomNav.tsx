import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/', label: 'בית', icon: '🏠' },
  { to: '/transactions', label: 'תנועות', icon: '📋' },
  { to: '/budgets', label: 'תקציב', icon: '🎯' },
  { to: '/insights', label: 'תובנות', icon: '📊' },
  { to: '/advisor', label: 'יועץ AI', icon: '🤖' },
  { to: '/settings', label: 'הגדרות', icon: '⚙️' },
]

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 flex justify-around z-50">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/'}
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 py-2 px-3 text-xs font-medium transition-colors ${
              isActive ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
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
