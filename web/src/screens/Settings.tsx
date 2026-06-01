import { useEffect, useState } from 'react'
import type { Account } from '@outflow/shared'
import { COMPANY_NAMES_HE, COMPANY_CREDENTIAL_FIELDS } from '@outflow/shared'
import { getAccounts, addAccount, deleteAccount, syncAccount } from '../api/accounts.js'
import { useAuth } from '../store/auth.js'
import { Spinner } from '../components/ui/Spinner.js'
import { PageHeader } from '../components/layout/PageHeader.js'

const COMPANIES = Object.entries(COMPANY_NAMES_HE) as [string, string][]

const FIELD_LABELS: Record<string, string> = {
  username: 'שם משתמש',
  password: 'סיסמה',
  userCode: 'קוד משתמש',
  id: 'מספר זהות',
  num: 'מספר חשבון',
  card6Digits: '6 ספרות אחרונות כרטיס',
  nationalID: 'ת.ז.',
  email: 'אימייל',
}

export function Settings() {
  const { user, logout } = useAuth()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState('')
  const [credentials, setCredentials] = useState<Record<string, string>>({})
  const [accountName, setAccountName] = useState('')
  const [adding, setAdding] = useState(false)
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    try {
      setAccounts(await getAccounts())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const credentialFields = selectedCompany
    ? (COMPANY_CREDENTIAL_FIELDS[selectedCompany as keyof typeof COMPANY_CREDENTIAL_FIELDS] ?? [])
    : []

  async function handleAddAccount(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedCompany) return
    setAdding(true)
    setError('')
    try {
      await addAccount({ companyId: selectedCompany, accountName: accountName || COMPANY_NAMES_HE[selectedCompany as keyof typeof COMPANY_NAMES_HE], credentials })
      setShowAdd(false)
      setSelectedCompany('')
      setCredentials({})
      setAccountName('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בהוספת חשבון')
    } finally {
      setAdding(false)
    }
  }

  async function handleSync(id: string) {
    setSyncingId(id)
    try {
      await syncAccount(id)
    } finally {
      setSyncingId(null)
      setTimeout(load, 3000)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('האם למחוק חשבון זה? כל התנועות שלו יימחקו.')) return
    await deleteAccount(id)
    await load()
  }

  return (
    <div className="p-4 space-y-6">
      <PageHeader title="הגדרות" />

      {/* User info */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-lg">
            {user?.displayName?.[0] ?? user?.email?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div>
            <p className="font-medium text-gray-900">{user?.displayName ?? user?.email}</p>
            <p className="text-xs text-gray-500">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Linked accounts */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">חשבונות מקושרים</h2>
          <button
            onClick={() => setShowAdd(true)}
            className="text-sm text-blue-600 font-medium hover:underline"
          >
            + הוספה
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-4"><Spinner /></div>
        ) : accounts.length === 0 ? (
          <p className="text-center text-gray-400 py-4 text-sm">אין חשבונות מקושרים</p>
        ) : (
          <div className="space-y-2">
            {accounts.map((acc) => (
              <div key={acc.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{acc.accountName}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {COMPANY_NAMES_HE[acc.companyId as keyof typeof COMPANY_NAMES_HE] ?? acc.companyId}
                    </p>
                    {acc.lastSyncAt && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        סנכרון אחרון: {new Intl.DateTimeFormat('he-IL', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(acc.lastSyncAt))}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSync(acc.id)}
                      disabled={syncingId === acc.id}
                      className="text-xs text-blue-500 hover:underline disabled:opacity-50"
                    >
                      {syncingId === acc.id ? 'מסנכרן...' : 'סנכרן'}
                    </button>
                    <button
                      onClick={() => handleDelete(acc.id)}
                      className="text-xs text-red-400 hover:underline"
                    >
                      מחיקה
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Logout */}
      <button
        onClick={logout}
        className="w-full py-3 border border-red-200 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors"
      >
        יציאה מהחשבון
      </button>

      {/* Add account modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white rounded-t-2xl w-full max-h-[90vh] overflow-y-auto p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">הוספת חשבון</h3>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 text-xl">✕</button>
            </div>

            <form onSubmit={handleAddAccount} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">בנק / כרטיס אשראי</label>
                <select
                  value={selectedCompany}
                  onChange={(e) => { setSelectedCompany(e.target.value); setCredentials({}) }}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">בחר מוסד פיננסי...</option>
                  {COMPANIES.map(([id, name]) => (
                    <option key={id} value={id}>{name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">שם לתצוגה</label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder={selectedCompany ? COMPANY_NAMES_HE[selectedCompany as keyof typeof COMPANY_NAMES_HE] : 'שם חשבון'}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              {credentialFields.map((field) => (
                <div key={field}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {FIELD_LABELS[field] ?? field}
                  </label>
                  <input
                    type={field === 'password' ? 'password' : 'text'}
                    required
                    value={credentials[field] ?? ''}
                    onChange={(e) => setCredentials((prev) => ({ ...prev, [field]: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              ))}

              {selectedCompany && ['amex', 'isracard'].includes(selectedCompany) && (
                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-2">
                  ⚠️ בנק זה עשוי להיות חסום על ידי Cloudflare. בעיות חיבור? נסה שוב מאוחר יותר.
                </p>
              )}

              {error && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={adding || !selectedCompany}
                className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {adding ? 'מוסיף ומסנכרן...' : 'הוסף חשבון'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
