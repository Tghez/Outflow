import { useEffect, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { formatAgorot } from '@outflow/shared'
import type { MonthlyTotal, CategoryBreakdown } from '@outflow/shared'
import { getMonthlyInsights, getCategoryInsights } from '../api/insights.js'
import { getBudgets } from '../api/budgets.js'
import type { BudgetWithSpent } from '@outflow/shared'
import { Spinner } from '../components/ui/Spinner.js'
import { PageHeader } from '../components/layout/PageHeader.js'
import { ProgressBar } from '../components/ui/ProgressBar.js'
import { AmountDisplay } from '../components/ui/AmountDisplay.js'

function currentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function monthHe(month: string) {
  const [y, m] = month.split('-').map(Number)
  return new Intl.DateTimeFormat('he-IL', { month: 'long', year: 'numeric' }).format(new Date(y, m - 1))
}

export function Dashboard() {
  const month = currentMonth()
  const [summary, setSummary] = useState<MonthlyTotal | null>(null)
  const [categories, setCategories] = useState<CategoryBreakdown[]>([])
  const [budgets, setBudgets] = useState<BudgetWithSpent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [monthly, cats, buds] = await Promise.all([
          getMonthlyInsights(1),
          getCategoryInsights(month),
          getBudgets(month),
        ])
        setSummary(monthly[0] ?? null)
        setCategories(cats.slice(0, 6))
        setBudgets(buds.slice(0, 3))
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [month])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="p-4 space-y-6">
      <PageHeader title="בית" subtitle={monthHe(month)} />

      {/* Income vs Expenses */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-xs text-green-600 font-medium mb-1">הכנסות</p>
          <AmountDisplay agorot={summary?.incomeAgorot ?? 0} className="text-lg" />
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-xs text-red-600 font-medium mb-1">הוצאות</p>
          <AmountDisplay agorot={-(summary?.expensesAgorot ?? 0)} className="text-lg" />
        </div>
      </div>

      {/* Category Donut */}
      {categories.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">התפלגות לפי קטגוריה</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={categories}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                dataKey="totalAgorot"
                nameKey="nameHe"
              >
                {categories.map((cat) => (
                  <Cell key={cat.categoryId} fill={cat.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => formatAgorot(value)}
                contentStyle={{ direction: 'rtl', fontFamily: 'Heebo' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {categories.map((cat) => (
              <div key={cat.categoryId} className="flex items-center gap-1.5 text-xs">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="text-gray-600 truncate">{cat.nameHe}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Budget Progress */}
      {budgets.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">מצב תקציב</h2>
          <div className="space-y-4">
            {budgets.map((b) => {
              const ratio = b.targetAmountAgorot > 0 ? b.spentAgorot / b.targetAmountAgorot : 0
              return (
                <div key={b.id}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium">
                      {b.icon} {b.nameHe}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatAgorot(b.spentAgorot)} מתוך {formatAgorot(b.targetAmountAgorot)}
                    </span>
                  </div>
                  <ProgressBar ratio={ratio} />
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
