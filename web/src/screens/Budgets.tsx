import { useEffect, useState } from 'react'
import type { BudgetWithSpent, Category } from '@outflow/shared'
import { formatAgorot } from '@outflow/shared'
import { getBudgets, upsertBudget, deleteBudget } from '../api/budgets.js'
import { getCategories } from '../api/categories.js'
import { ProgressBar } from '../components/ui/ProgressBar.js'
import { Spinner } from '../components/ui/Spinner.js'
import { PageHeader } from '../components/layout/PageHeader.js'

function currentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function monthHe(month: string) {
  const [y, m] = month.split('-').map(Number)
  return new Intl.DateTimeFormat('he-IL', { month: 'long', year: 'numeric' }).format(new Date(y, m - 1))
}

export function Budgets() {
  const month = currentMonth()
  const [budgets, setBudgets] = useState<BudgetWithSpent[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<{ categoryId: string; nameHe: string; current?: number } | null>(null)
  const [inputVal, setInputVal] = useState('')
  const [saving, setSaving] = useState(false)

  const budgetedIds = new Set(budgets.map((b) => b.categoryId))
  const unbugeted = categories.filter((c) => !budgetedIds.has(c.id))

  async function load() {
    setLoading(true)
    try {
      const [buds, cats] = await Promise.all([getBudgets(month), getCategories()])
      setBudgets(buds)
      setCategories(cats)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [month])

  async function handleSave() {
    if (!modal) return
    const amount = parseInt(inputVal.replace(/[^0-9]/g, ''), 10)
    if (!amount || amount <= 0) return
    setSaving(true)
    try {
      await upsertBudget(month, modal.categoryId, amount * 100)
      await load()
      setModal(null)
      setInputVal('')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(categoryId: string) {
    await deleteBudget(month, categoryId)
    await load()
  }

  function openModal(categoryId: string, nameHe: string, currentAgorot?: number) {
    setModal({ categoryId, nameHe, current: currentAgorot })
    setInputVal(currentAgorot ? String(Math.round(currentAgorot / 100)) : '')
  }

  if (loading) {
    return <div className="flex justify-center py-16"><Spinner /></div>
  }

  return (
    <div className="p-4">
      <PageHeader title="תקציב" subtitle={monthHe(month)} />

      <div className="space-y-3 mb-6">
        {budgets.map((b) => {
          const ratio = b.targetAmountAgorot > 0 ? b.spentAgorot / b.targetAmountAgorot : 0
          return (
            <div key={b.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900">{b.icon} {b.nameHe}</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => openModal(b.categoryId, b.nameHe, b.targetAmountAgorot)} className="text-blue-500 text-xs hover:underline">
                    עריכה
                  </button>
                  <button onClick={() => handleDelete(b.categoryId)} className="text-red-400 text-xs hover:underline">
                    מחיקה
                  </button>
                </div>
              </div>
              <ProgressBar ratio={ratio} className="mb-2" />
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">
                  {formatAgorot(b.spentAgorot)} מתוך {formatAgorot(b.targetAmountAgorot)}
                </span>
                <span className={ratio >= 1 ? 'text-red-600 font-semibold' : ratio >= 0.8 ? 'text-amber-600' : 'text-green-600'}>
                  {Math.round(ratio * 100)}%
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {unbugeted.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 mb-2">הוסף תקציב לקטגוריה</h2>
          <div className="space-y-2">
            {unbugeted.map((c) => (
              <button
                key={c.id}
                onClick={() => openModal(c.id, c.nameHe)}
                className="w-full flex items-center gap-3 bg-white rounded-xl border border-dashed border-gray-200 p-3 hover:border-blue-300 transition-colors"
              >
                <span className="text-xl">{c.icon}</span>
                <span className="text-sm text-gray-700">{c.nameHe}</span>
                <span className="ms-auto text-blue-500 text-sm">+</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Set target modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">
              {modal.current ? 'עדכון תקציב' : 'הגדרת תקציב'} — {modal.nameHe}
            </h3>
            <label className="block text-sm font-medium text-gray-700 mb-1">יעד חודשי (₪)</label>
            <input
              type="number"
              min="1"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              placeholder="500"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => setModal(null)}
                className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50"
              >
                ביטול
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'שומר...' : 'שמירה'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
