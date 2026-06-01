import { useEffect, useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { formatAgorot } from '@outflow/shared'
import type { MonthlyTotal, CategoryBreakdown } from '@outflow/shared'
import { getMonthlyInsights, getCategoryInsights } from '../api/insights.js'
import { Spinner } from '../components/ui/Spinner.js'
import { PageHeader } from '../components/layout/PageHeader.js'

function currentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function monthShortHe(month: string) {
  const [y, m] = month.split('-').map(Number)
  return new Intl.DateTimeFormat('he-IL', { month: 'short' }).format(new Date(y, m - 1))
}

export function Insights() {
  const month = currentMonth()
  const [monthly, setMonthly] = useState<MonthlyTotal[]>([])
  const [categories, setCategories] = useState<CategoryBreakdown[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [mon, cats] = await Promise.all([
          getMonthlyInsights(4),
          getCategoryInsights(month),
        ])
        setMonthly(mon)
        setCategories(cats)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [month])

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>

  const chartData = monthly.map((m) => ({
    name: monthShortHe(m.month),
    הכנסות: Math.round(m.incomeAgorot / 100),
    הוצאות: Math.round(m.expensesAgorot / 100),
  }))

  return (
    <div className="p-4 space-y-6">
      <PageHeader title="תובנות" />

      {/* Bar Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">השוואה חודשית</h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} layout="horizontal">
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: 'Heebo' }} />
            <YAxis
              orientation="right"
              tick={{ fontSize: 10, fontFamily: 'Heebo' }}
              tickFormatter={(v: number) => `₪${(v / 1000).toFixed(0)}K`}
            />
            <Tooltip
              formatter={(value: number) => [`₪${value.toLocaleString('he-IL')}`, '']}
              contentStyle={{ direction: 'rtl', fontFamily: 'Heebo', fontSize: 12 }}
            />
            <Legend wrapperStyle={{ fontFamily: 'Heebo', fontSize: 12 }} />
            <Bar dataKey="הכנסות" fill="#22c55e" radius={[4, 4, 0, 0]} />
            <Bar dataKey="הוצאות" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Category trends */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">מגמות לפי קטגוריה</h2>
        <div className="space-y-3">
          {categories.map((cat) => (
            <div key={cat.categoryId} className="flex items-center gap-3">
              <span className="text-lg">{cat.icon}</span>
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-800">{cat.nameHe}</span>
              </div>
              <span className="text-sm font-semibold tabular-nums">{formatAgorot(cat.totalAgorot)}</span>
              {cat.changePercent !== null && (
                <span
                  className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                    cat.changePercent > 0
                      ? 'bg-red-50 text-red-600'
                      : 'bg-green-50 text-green-600'
                  }`}
                >
                  {cat.changePercent > 0 ? '+' : ''}{cat.changePercent}%
                </span>
              )}
            </div>
          ))}
          {categories.length === 0 && (
            <p className="text-center text-gray-400 py-4">אין נתונים לחודש זה</p>
          )}
        </div>
      </div>
    </div>
  )
}
