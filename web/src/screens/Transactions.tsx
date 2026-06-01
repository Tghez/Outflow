import { useEffect, useState, useCallback } from 'react'
import type { Transaction, Category } from '@outflow/shared'
import { getTransactions, updateTransactionCategory } from '../api/transactions.js'
import { getCategories } from '../api/categories.js'
import { Spinner } from '../components/ui/Spinner.js'
import { PageHeader } from '../components/layout/PageHeader.js'
import { AmountDisplay } from '../components/ui/AmountDisplay.js'
import { CategoryBadge } from '../components/ui/CategoryBadge.js'

function currentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'long' }).format(new Date(dateStr))
}

function prevMonth(month: string) {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function nextMonth(month: string) {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthHe(month: string) {
  const [y, m] = month.split('-').map(Number)
  return new Intl.DateTimeFormat('he-IL', { month: 'long', year: 'numeric' }).format(new Date(y, m - 1))
}

export function Transactions() {
  const [month, setMonth] = useState(currentMonth)
  const [txns, setTxns] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [overrideModal, setOverrideModal] = useState<Transaction | null>(null)

  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c]))

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [res, cats] = await Promise.all([
        getTransactions({ month, categoryId: filterCat || undefined, page, limit: 50 }),
        categories.length === 0 ? getCategories() : Promise.resolve(null),
      ])
      setTxns(res.data)
      setTotalPages(res.totalPages)
      if (cats) setCategories(cats)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [month, filterCat, page])

  useEffect(() => { void load() }, [load])

  const filtered = search
    ? txns.filter((t) => t.description.toLowerCase().includes(search.toLowerCase()))
    : txns

  async function handleOverride(txn: Transaction, categoryId: string) {
    try {
      await updateTransactionCategory(txn.id, categoryId)
      setTxns((prev) => prev.map((t) => t.id === txn.id ? { ...t, categoryId, categoryOverriddenByUser: true } : t))
      setOverrideModal(null)
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="p-4">
      <PageHeader title="תנועות" />

      {/* Month selector */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => { setMonth(nextMonth(month)); setPage(1) }} className="p-2 rounded-lg hover:bg-gray-100">◀</button>
        <span className="font-medium text-gray-700">{monthHe(month)}</span>
        <button onClick={() => { setMonth(prevMonth(month)); setPage(1) }} className="p-2 rounded-lg hover:bg-gray-100">▶</button>
      </div>

      {/* Search & filter */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="חיפוש..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={filterCat}
          onChange={(e) => { setFilterCat(e.target.value); setPage(1) }}
          className="border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none"
        >
          <option value="">כל הקטגוריות</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.icon} {c.nameHe}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : (
        <div className="space-y-2">
          {filtered.map((txn) => {
            const cat = txn.categoryId ? categoryMap[txn.categoryId] : null
            return (
              <div
                key={txn.id}
                onClick={() => setOverrideModal(txn)}
                className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{txn.description}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDate(txn.date)}</p>
                </div>
                {cat && <CategoryBadge icon={cat.icon} nameHe={cat.nameHe} color={cat.color} size="sm" />}
                <AmountDisplay agorot={txn.chargedAmountAgorot} className="text-sm shrink-0" />
              </div>
            )
          })}
          {filtered.length === 0 && (
            <p className="text-center text-gray-400 py-8">אין תנועות לחודש זה</p>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1 text-sm rounded-lg border disabled:opacity-50"
          >
            הקודם
          </button>
          <span className="px-3 py-1 text-sm">{page} / {totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1 text-sm rounded-lg border disabled:opacity-50"
          >
            הבא
          </button>
        </div>
      )}

      {/* Category override modal */}
      {overrideModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50" onClick={() => setOverrideModal(null)}>
          <div
            className="bg-white rounded-t-2xl w-full max-h-[70vh] overflow-y-auto p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-gray-900 mb-1">שינוי קטגוריה</h3>
            <p className="text-sm text-gray-500 mb-4">{overrideModal.description}</p>
            <div className="space-y-1">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleOverride(overrideModal, cat.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl text-right hover:bg-gray-50 transition-colors ${
                    overrideModal.categoryId === cat.id ? 'bg-blue-50 border border-blue-200' : ''
                  }`}
                >
                  <span className="text-xl">{cat.icon}</span>
                  <span className="text-sm font-medium">{cat.nameHe}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
