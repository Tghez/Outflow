import { useEffect, useState } from 'react'
import type { Account, BudgetWithSpent, Category } from '@outflow/shared'
import { COMPANY_NAMES_HE, COMPANY_CREDENTIAL_FIELDS } from '@outflow/shared'
import { getAccounts, addAccount, deleteAccount, syncAccount } from '../api/accounts.js'
import { getBudgets, upsertBudget, deleteBudget } from '../api/budgets.js'
import { getCategories } from '../api/categories.js'
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

function currentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function Settings() {
  const { user, logout } = useAuth()
  const month = currentMonth()

  // Accounts state
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState('')
  const [credentials, setCredentials] = useState<Record<string, string>>({})
  const [accountName, setAccountName] = useState('')
  const [adding, setAdding] = useState(false)
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [accountError, setAccountError] = useState('')

  // Budget state
  const [budgets, setBudgets] = useState<BudgetWithSpent[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loadingBudgets, setLoadingBudgets] = useState(true)
  const [budgetModal, setBudgetModal] = useState<{ categoryId: string; nameHe: string; current?: number } | null>(null)
  const [budgetInput, setBudgetInput] = useState('')
  const [savingBudget, setSavingBudget] = useState(false)
  const [showUnbudgeted, setShowUnbudgeted] = useState(false)

  const budgetedIds = new Set(budgets.map((b) => b.categoryId))
  const unbudgeted = categories.filter((c) => !budgetedIds.has(c.id))

  const credentialFields = selectedCompany
    ? (COMPANY_CREDENTIAL_FIELDS[selectedCompany as keyof typeof COMPANY_CREDENTIAL_FIELDS] ?? [])
    : []

  async function loadAccounts() {
    setLoadingAccounts(true)
    try {
      setAccounts(await getAccounts())
    } finally {
      setLoadingAccounts(false)
    }
  }

  async function loadBudgets() {
    setLoadingBudgets(true)
    try {
      const [buds, cats] = await Promise.all([getBudgets(month), getCategories()])
      setBudgets(buds)
      setCategories(cats)
    } finally {
      setLoadingBudgets(false)
    }
  }

  useEffect(() => {
    void loadAccounts()
    void loadBudgets()
  }, [])

  async function handleAddAccount(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedCompany) return
    setAdding(true)
    setAccountError('')
    try {
      await addAccount({ companyId: selectedCompany, accountName: accountName || COMPANY_NAMES_HE[selectedCompany as keyof typeof COMPANY_NAMES_HE], credentials })
      setShowAdd(false)
      setSelectedCompany('')
      setCredentials({})
      setAccountName('')
      await loadAccounts()
    } catch (err) {
      setAccountError(err instanceof Error ? err.message : 'שגיאה בהוספת חשבון')
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
      setTimeout(loadAccounts, 3000)
    }
  }

  async function handleDeleteAccount(id: string) {
    if (!confirm('האם למחוק חשבון זה? כל התנועות שלו יימחקו.')) return
    await deleteAccount(id)
    await loadAccounts()
  }

  function openBudgetModal(categoryId: string, nameHe: string, currentAgorot?: number) {
    setBudgetModal({ categoryId, nameHe, current: currentAgorot })
    setBudgetInput(currentAgorot ? String(Math.round(currentAgorot / 100)) : '')
  }

  async function handleSaveBudget() {
    if (!budgetModal) return
    const amount = parseInt(budgetInput.replace(/[^0-9]/g, ''), 10)
    if (!amount || amount <= 0) return
    setSavingBudget(true)
    try {
      await upsertBudget(month, budgetModal.categoryId, amount * 100)
      await loadBudgets()
      setBudgetModal(null)
      setBudgetInput('')
    } finally {
      setSavingBudget(false)
    }
  }

  async function handleDeleteBudget(categoryId: string) {
    await deleteBudget(month, categoryId)
    await loadBudgets()
  }

  return (
    <div className="p-4 space-y-6 bg-brand-bg min-h-screen pb-28">
      <PageHeader title="הגדרות" />

      {/* User info */}
      <div className="bg-brand-surface rounded-2xl border border-brand-light/50 shadow-sm p-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-brand-light flex items-center justify-center text-brand-accent font-bold text-lg">
            {user?.displayName?.[0] ?? user?.email?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div>
            <p className="font-semibold text-brand-text">{user?.displayName ?? user?.email}</p>
            <p className="text-xs text-brand-muted">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Linked accounts */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setShowAdd(true)}
            className="text-sm text-brand-accent font-semibold hover:underline"
          >
            + הוספה
          </button>
          <h2 className="text-sm font-bold text-brand-text">חשבונות מקושרים</h2>
        </div>

        {loadingAccounts ? (
          <div className="flex justify-center py-4"><Spinner /></div>
        ) : accounts.length === 0 ? (
          <p className="text-center text-brand-muted py-4 text-sm">אין חשבונות מקושרים</p>
        ) : (
          <div className="space-y-2">
            {accounts.map((acc) => (
              <div key={acc.id} className="bg-brand-surface rounded-2xl border border-brand-light/50 shadow-sm p-4">
                <div className="flex items-start justify-between">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSync(acc.id)}
                      disabled={syncingId === acc.id}
                      className="text-xs text-brand-accent hover:underline disabled:opacity-50"
                    >
                      {syncingId === acc.id ? 'מסנכרן...' : 'סנכרן'}
                    </button>
                    <button
                      onClick={() => handleDeleteAccount(acc.id)}
                      className="text-xs text-brand-light hover:text-brand-accent"
                    >
                      מחיקה
                    </button>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-brand-text">{acc.accountName}</p>
                    <p className="text-xs text-brand-muted mt-0.5">
                      {COMPANY_NAMES_HE[acc.companyId as keyof typeof COMPANY_NAMES_HE] ?? acc.companyId}
                    </p>
                    {acc.lastSyncAt && (
                      <p className="text-xs text-brand-muted/60 mt-0.5">
                        סנכרון: {new Intl.DateTimeFormat('he-IL', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(acc.lastSyncAt))}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Budget management */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setShowUnbudgeted((v) => !v)}
            className="text-sm text-brand-accent font-semibold hover:underline"
          >
            + הוסף תקציב
          </button>
          <h2 className="text-sm font-bold text-brand-text">ניהול תקציבים</h2>
        </div>

        {loadingBudgets ? (
          <div className="flex justify-center py-4"><Spinner /></div>
        ) : (
          <div className="space-y-2">
            {budgets.map((b) => (
              <div key={b.id} className="bg-brand-surface rounded-2xl border border-brand-light/50 shadow-sm p-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-brand-text">{b.icon} {b.nameHe}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openBudgetModal(b.categoryId, b.nameHe, b.targetAmountAgorot)}
                      className="text-xs text-brand-accent hover:underline"
                    >
                      עריכה
                    </button>
                    <button
                      onClick={() => handleDeleteBudget(b.categoryId)}
                      className="text-xs text-brand-light hover:text-brand-accent"
                    >
                      מחיקה
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {budgets.length === 0 && !showUnbudgeted && (
              <p className="text-center text-brand-muted text-sm py-4">טרם הוגדרו תקציבים לחודש זה</p>
            )}
          </div>
        )}

        {/* Add budget to unbudgeted categories */}
        {showUnbudgeted && unbudgeted.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-xs font-semibold text-brand-muted mb-1">בחר קטגוריה להוספת תקציב</p>
            {unbudgeted.map((c) => (
              <button
                key={c.id}
                onClick={() => { openBudgetModal(c.id, c.nameHe); setShowUnbudgeted(false) }}
                className="w-full flex items-center gap-3 bg-brand-surface rounded-xl border border-dashed border-brand-light p-3 hover:border-brand-accent transition-colors"
              >
                <span className="text-brand-accent text-sm font-bold ms-auto">+</span>
                <span className="text-sm text-brand-text">{c.nameHe}</span>
                <span className="text-xl">{c.icon}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Logout */}
      <button
        onClick={logout}
        className="w-full py-3 border border-brand-light text-brand-accent rounded-2xl text-sm font-semibold hover:bg-brand-light/20 transition-colors"
      >
        יציאה מהחשבון
      </button>

      {/* Add account bottom sheet */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-brand-bg rounded-t-2xl w-full max-h-[90vh] overflow-y-auto p-4">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setShowAdd(false)} className="text-brand-muted text-xl">✕</button>
              <h3 className="font-bold text-brand-text">הוספת חשבון</h3>
            </div>

            <form onSubmit={handleAddAccount} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-brand-text mb-1">בנק / כרטיס אשראי</label>
                <select
                  value={selectedCompany}
                  onChange={(e) => { setSelectedCompany(e.target.value); setCredentials({}) }}
                  required
                  className="w-full border border-brand-light rounded-xl px-3 py-2 text-sm bg-brand-surface focus:outline-none focus:ring-2 focus:ring-brand-accent"
                >
                  <option value="">בחר מוסד פיננסי...</option>
                  {COMPANIES.map(([id, name]) => (
                    <option key={id} value={id}>{name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-brand-text mb-1">שם לתצוגה</label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder={selectedCompany ? COMPANY_NAMES_HE[selectedCompany as keyof typeof COMPANY_NAMES_HE] : 'שם חשבון'}
                  className="w-full border border-brand-light rounded-xl px-3 py-2 text-sm bg-brand-surface focus:outline-none focus:ring-2 focus:ring-brand-accent"
                />
              </div>

              {credentialFields.map((field) => (
                <div key={field}>
                  <label className="block text-sm font-semibold text-brand-text mb-1">
                    {FIELD_LABELS[field] ?? field}
                  </label>
                  <input
                    type={field === 'password' ? 'password' : 'text'}
                    required
                    value={credentials[field] ?? ''}
                    onChange={(e) => setCredentials((prev) => ({ ...prev, [field]: e.target.value }))}
                    className="w-full border border-brand-light rounded-xl px-3 py-2 text-sm bg-brand-surface focus:outline-none focus:ring-2 focus:ring-brand-accent"
                  />
                </div>
              ))}

              {selectedCompany && ['amex', 'isracard'].includes(selectedCompany) && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-2">
                  ⚠️ בנק זה עשוי להיות חסום על ידי Cloudflare. בעיות חיבור? נסה שוב מאוחר יותר.
                </p>
              )}

              {accountError && (
                <p className="text-xs text-brand-accent bg-brand-light/30 border border-brand-light rounded-xl p-2">{accountError}</p>
              )}

              <button
                type="submit"
                disabled={adding || !selectedCompany}
                className="w-full py-3 bg-brand-accent text-white rounded-xl text-sm font-bold hover:bg-brand-dark disabled:opacity-50 transition-colors"
              >
                {adding ? 'מוסיף ומסנכרן...' : 'הוסף חשבון'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Budget set/edit modal */}
      {budgetModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-brand-bg rounded-2xl w-full max-w-sm p-6 border border-brand-light/50 shadow-xl">
            <h3 className="font-bold text-brand-text mb-4">
              {budgetModal.current ? 'עדכון תקציב' : 'הגדרת תקציב'} — {budgetModal.nameHe}
            </h3>
            <label className="block text-sm font-semibold text-brand-muted mb-1">יעד חודשי (₪)</label>
            <input
              type="number"
              min="1"
              value={budgetInput}
              onChange={(e) => setBudgetInput(e.target.value)}
              className="w-full border border-brand-light rounded-xl px-3 py-2.5 text-lg font-bold text-brand-text bg-brand-surface focus:outline-none focus:ring-2 focus:ring-brand-accent mb-4"
              placeholder="500"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => setBudgetModal(null)}
                className="flex-1 py-2.5 border border-brand-light rounded-xl text-sm font-semibold text-brand-muted hover:bg-brand-surface transition-colors"
              >
                ביטול
              </button>
              <button
                onClick={handleSaveBudget}
                disabled={savingBudget}
                className="flex-1 py-2.5 bg-brand-accent text-white rounded-xl text-sm font-bold hover:bg-brand-dark disabled:opacity-50 transition-colors"
              >
                {savingBudget ? 'שומר...' : 'שמירה'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
