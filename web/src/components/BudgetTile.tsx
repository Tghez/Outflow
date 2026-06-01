import { useState, forwardRef } from 'react'
import type { BudgetWithSpent, Transaction } from '@outflow/shared'
import { formatAgorot } from '@outflow/shared'
import { getTransactions } from '../api/transactions.js'
import { ProgressBar } from './ui/ProgressBar.js'

interface Props {
  budget: BudgetWithSpent
  month: string
  style?: React.CSSProperties
}

export const BudgetTile = forwardRef<HTMLDivElement, Props>(function BudgetTile(
  { budget, month, style },
  ref
) {
  const [open, setOpen] = useState(false)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loaded, setLoaded] = useState(false)
  const [loading, setLoading] = useState(false)

  const ratio = budget.targetAmountAgorot > 0 ? budget.spentAgorot / budget.targetAmountAgorot : 0
  const pct = Math.round(ratio * 100)
  const statusColor = ratio >= 1 ? 'text-brand-accent' : ratio >= 0.8 ? 'text-amber-600' : 'text-green-600'
  const pctBg = ratio >= 1 ? 'bg-brand-light text-brand-accent' : ratio >= 0.8 ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'

  async function openModal() {
    setOpen(true)
    if (!loaded) {
      setLoading(true)
      try {
        const res = await getTransactions({ month, categoryId: budget.categoryId, limit: 50 })
        setTransactions(res.data)
        setLoaded(true)
      } finally {
        setLoading(false)
      }
    }
  }

  return (
    <>
      {/* Tile card */}
      <div
        ref={ref}
        className="budget-tile rounded-2xl border border-brand-light/60 bg-brand-surface shadow-sm cursor-pointer hover:shadow-md transition-shadow"
        style={style}
        onClick={openModal}
      >
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-brand-text">{budget.nameHe}</span>
              <span className="text-lg">{budget.icon}</span>
            </div>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${pctBg}`}>{pct}%</span>
          </div>
          <ProgressBar ratio={ratio} className="mb-3" />
          <div className="flex items-center justify-between text-sm">
            <span className={`font-semibold ${statusColor}`}>{formatAgorot(budget.spentAgorot)}</span>
            <span className="text-brand-muted">מתוך {formatAgorot(budget.targetAmountAgorot)}</span>
          </div>
        </div>
      </div>

      {/* Modal */}
      {open && (
        <>
          {/* Blurred backdrop */}
          <div
            className="fixed inset-0 z-50 backdrop-blur-sm"
            style={{ backgroundColor: 'rgba(0,0,0,0.25)' }}
            onClick={() => setOpen(false)}
          />

          {/* Centered modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div
              className="modal-enter rounded-2xl shadow-2xl flex flex-col pointer-events-auto"
              style={{ width: '33.333vw', maxHeight: '80vh', backgroundColor: '#FFFBF1' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="p-5 border-b border-brand-light/50 flex-shrink-0">
                <div className="flex items-center justify-between mb-3">
                  <button
                    onClick={() => setOpen(false)}
                    className="text-brand-muted hover:text-brand-text text-lg leading-none"
                    aria-label="סגור"
                  >
                    ✕
                  </button>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-brand-text text-lg">{budget.nameHe}</span>
                    <span className="text-2xl">{budget.icon}</span>
                  </div>
                </div>
                <ProgressBar ratio={ratio} className="mb-3" />
                <div className="flex items-center justify-between text-sm">
                  <span className={`font-semibold text-base ${statusColor}`}>{formatAgorot(budget.spentAgorot)}</span>
                  <span className="text-brand-muted">מתוך {formatAgorot(budget.targetAmountAgorot)}</span>
                </div>
              </div>

              {/* Transaction list */}
              <div className="overflow-y-auto flex-1 p-5">
                {loading && (
                  <p className="text-center text-brand-muted text-sm py-6">טוען...</p>
                )}
                {!loading && loaded && transactions.length === 0 && (
                  <p className="text-center text-brand-muted text-sm py-6">אין תנועות בקטגוריה זו</p>
                )}
                {!loading && transactions.length > 0 && (
                  <ul className="space-y-0">
                    {transactions.map((tx) => (
                      <li
                        key={tx.id}
                        className="flex items-center justify-between text-sm py-3 border-b border-brand-light/30 last:border-0"
                      >
                        <div className="text-right">
                          <p className="text-brand-text font-medium leading-tight">{tx.description}</p>
                          <p className="text-brand-muted text-xs mt-0.5">{tx.date}</p>
                        </div>
                        <span className="font-semibold text-brand-accent mr-4">
                          {formatAgorot(Math.abs(tx.chargedAmountAgorot))}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
})
