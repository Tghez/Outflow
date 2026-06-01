import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { login, register } from '../api/auth.js'
import { useAuth } from '../store/auth.js'

export function Login() {
  const { login: authLogin } = useAuth()
  const navigate = useNavigate()
  const [isRegister, setIsRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = isRegister
        ? await register(email, password, displayName || undefined)
        : await login(email, password)
      authLogin(res.token, res.user)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בהתחברות')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-sm p-8">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">💸</div>
          <h1 className="text-2xl font-bold text-gray-900">Outflow</h1>
          <p className="text-gray-500 text-sm mt-1">מעקב הוצאות חכם</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">שם לתצוגה</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="ישראל ישראלי"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">אימייל</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">סיסמה</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="לפחות 8 תווים"
            />
          </div>

          {error && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white rounded-lg py-2.5 font-medium text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'טוען...' : isRegister ? 'הרשמה' : 'כניסה'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          {isRegister ? 'כבר יש לך חשבון?' : 'אין לך חשבון?'}
          {' '}
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="text-blue-600 font-medium hover:underline"
          >
            {isRegister ? 'כניסה' : 'הרשמה'}
          </button>
        </p>
      </div>
    </div>
  )
}
