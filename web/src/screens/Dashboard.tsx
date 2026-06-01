import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatAgorot } from '@outflow/shared'
import type { MonthlyTotal, BudgetWithSpent } from '@outflow/shared'
import { getMonthlyInsights } from '../api/insights.js'
import { getBudgets } from '../api/budgets.js'
import { BudgetTile } from '../components/BudgetTile.js'
import { Spinner } from '../components/ui/Spinner.js'

function currentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function addMonths(month: string, delta: number) {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthHe(month: string) {
  const [y, m] = month.split('-').map(Number)
  return new Intl.DateTimeFormat('he-IL', { month: 'long', year: 'numeric' }).format(new Date(y, m - 1))
}

export function Dashboard() {
  const now = currentMonth()
  const [selectedMonth, setSelectedMonth] = useState(now)
  const [summary, setSummary] = useState<MonthlyTotal | null>(null)
  const [budgets, setBudgets] = useState<BudgetWithSpent[]>([])
  const [loading, setLoading] = useState(true)
  const tileRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    setLoading(true)
    async function load() {
      try {
        const monthIndex = monthsBetween(selectedMonth, now)
        const [monthlies, buds] = await Promise.all([
          getMonthlyInsights(Math.max(monthIndex + 1, 1)),
          getBudgets(selectedMonth),
        ])
        const found = monthlies.find((m) => m.month === selectedMonth) ?? monthlies[0] ?? null
        setSummary(found)
        setBudgets(buds)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [selectedMonth])

  useEffect(() => {
    if (loading) return
    tileRefs.current = tileRefs.current.slice(0, budgets.length)
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('visible')
            observer.unobserve(e.target)
          }
        })
      },
      { threshold: 0.08 }
    )
    tileRefs.current.forEach((el) => el && observer.observe(el))
    return () => observer.disconnect()
  }, [budgets, loading])

  function prevMonth() {
    setSelectedMonth((m) => addMonths(m, -1))
  }

  function nextMonth() {
    if (selectedMonth < now) setSelectedMonth((m) => addMonths(m, 1))
  }

  const isCurrentMonth = selectedMonth === now

  return (
    <div className="min-h-screen bg-brand-bg">
      {/* Sticky month header */}
      <header className="sticky top-0 z-40 bg-brand-bg/95 backdrop-blur border-b border-brand-light/40 px-5 py-3 flex items-center justify-between">
        <button
          onClick={nextMonth}
          disabled={isCurrentMonth}
          className="w-9 h-9 flex items-center justify-center rounded-full text-brand-accent disabled:opacity-30 hover:bg-brand-light/30 transition-colors text-lg"
          aria-label="חודש הבא"
        >
          ◀
        </button>
        <h1 className="font-bold text-brand-text text-base">{monthHe(selectedMonth)}</h1>
        <button
          onClick={prevMonth}
          className="w-9 h-9 flex items-center justify-center rounded-full text-brand-accent hover:bg-brand-light/30 transition-colors text-lg"
          aria-label="חודש קודם"
        >
          ▶
        </button>
      </header>

      <div className="px-4 pt-5 pb-32 space-y-6">
        {/* Hero tiles */}
        <div className="grid grid-cols-2 gap-3">
          <div className="tile-animate-1 bg-brand-surface border border-brand-light/60 rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-semibold text-brand-muted mb-2 tracking-wide uppercase">הכנסות</p>
            <p className="text-2xl font-bold text-green-600">
              {loading ? '—' : formatAgorot(summary?.incomeAgorot ?? 0)}
            </p>
          </div>
          <div className="tile-animate-2 bg-brand-surface border border-brand-light rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-semibold text-brand-muted mb-2 tracking-wide uppercase">הוצאות</p>
            <p className="text-2xl font-bold text-brand-accent">
              {loading ? '—' : formatAgorot(summary?.expensesAgorot ?? 0)}
            </p>
          </div>
        </div>

        {/* Budget section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <Link to="/settings" className="text-xs font-semibold text-brand-accent hover:underline">
              ניהול תקציבים ←
            </Link>
            <h2 className="text-base font-bold text-brand-text">התקציבים שלך</h2>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : budgets.length === 0 ? (
            <div className="text-center py-12 px-6">
              <p className="text-4xl mb-3">🎯</p>
              <p className="text-brand-text font-semibold mb-1">טרם הוגדרו תקציבים</p>
              <p className="text-brand-muted text-sm mb-4">הגדר תקציבים לקטגוריות כדי לעקוב אחר ההוצאות שלך</p>
              <Link
                to="/settings"
                className="inline-block px-5 py-2.5 bg-brand-accent text-white rounded-xl text-sm font-semibold hover:bg-brand-dark transition-colors"
              >
                הוסף תקציב
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {budgets.map((b, i) => (
                <BudgetTile
                  key={b.id}
                  budget={b}
                  month={selectedMonth}
                  ref={(el) => { tileRefs.current[i] = el }}
                  style={{ transitionDelay: `${i * 80}ms` }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function monthsBetween(a: string, b: string) {
  const [ay, am] = a.split('-').map(Number)
  const [by, bm] = b.split('-').map(Number)
  return Math.abs((by - ay) * 12 + (bm - am))
}
