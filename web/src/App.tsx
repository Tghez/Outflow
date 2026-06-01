import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './store/auth.js'
import { BottomNav } from './components/layout/BottomNav.js'
import { AIPanel } from './components/AIPanel.js'
import { Login } from './screens/Login.js'
import { Dashboard } from './screens/Dashboard.js'
import { Transactions } from './screens/Transactions.js'
import { Insights } from './screens/Insights.js'
import { Settings } from './screens/Settings.js'

function AppLayout() {
  const { token } = useAuth()

  if (!token) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  return (
    <div className="min-h-screen bg-brand-bg pb-20">
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/insights" element={<Insights />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <BottomNav />
      <AIPanel />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    </AuthProvider>
  )
}
