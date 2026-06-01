import { useState } from 'react'
import { formatAgorot } from '@outflow/shared'
import type { AdvisorAdvice } from '@outflow/shared'
import { getAdvisorAdvice, recategorizeTransactions } from '../api/ai.js'
import { Spinner } from '../components/ui/Spinner.js'
import { PageHeader } from '../components/layout/PageHeader.js'

function currentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(month: string) {
  const [y, m] = month.split('-').map(Number)
  return new Intl.DateTimeFormat('he-IL', { month: 'long', year: 'numeric' }).format(
    new Date(y, m - 1),
  )
}

const RISK_CONFIG = {
  low:    { label: 'נמוך',   bg: 'bg-green-50',  text: 'text-green-700',  icon: '🟢' },
  medium: { label: 'בינוני', bg: 'bg-amber-50',  text: 'text-amber-700',  icon: '🟡' },
  high:   { label: 'גבוה',  bg: 'bg-red-50',    text: 'text-red-700',    icon: '🔴' },
}

export function Advisor() {
  const [selectedMonth, setSelectedMonth] = useState(currentMonth())
  const [advice, setAdvice] = useState<AdvisorAdvice | null>(null)
  const [loading, setLoading] = useState(false)
  const [recatLoading, setRecatLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recatMsg, setRecatMsg] = useState<string | null>(null)

  async function handleAnalyze() {
    setLoading(true)
    setError(null)
    setAdvice(null)
    try {
      const result = await getAdvisorAdvice(selectedMonth)
      setAdvice(result.advice)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה לא ידועה')
    } finally {
      setLoading(false)
    }
  }

  async function handleRecategorize() {
    setRecatLoading(true)
    setRecatMsg(null)
    try {
      const result = await recategorizeTransactions()
      setRecatMsg(`עודכנו ${result.updated} עסקאות בהצלחה`)
    } catch (err) {
      setRecatMsg(err instanceof Error ? err.message : 'שגיאה')
    } finally {
      setRecatLoading(false)
    }
  }

  // Month selector options: current + 3 months back
  const monthOptions = Array.from({ length: 4 }, (_, i) => {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() - i)
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    return { val, label: monthLabel(val) }
  })

  const risk = advice ? RISK_CONFIG[advice.riskLevel] : null

  return (
    <div className="p-4 space-y-4" dir="rtl">
      <PageHeader title="יועץ AI" subtitle="ניתוח פיננסי חכם מבוסס בינה מלאכותית" />

      {/* Month selector + Run button */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
        <label className="block text-sm font-medium text-gray-700">בחר חודש לניתוח</label>
        <select
          value={selectedMonth}
          onChange={(e) => { setSelectedMonth(e.target.value); setAdvice(null) }}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {monthOptions.map((o) => (
            <option key={o.val} value={o.val}>{o.label}</option>
          ))}
        </select>

        <button
          onClick={handleAnalyze}
          disabled={loading}
          className="w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Spinner />
              <span>מנתח את ההוצאות שלך...</span>
            </>
          ) : (
            '🤖 הפעל ניתוח'
          )}
        </button>

        {loading && (
          <p className="text-xs text-gray-400 text-center">
            הניתוח עשוי לקחת עד 20 שניות...
          </p>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          ⚠️ {error}
        </div>
      )}

      {/* Advice */}
      {advice && (
        <div className="space-y-4">
          {/* Summary + Risk */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700">סיכום חודשי</h2>
              {risk && (
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${risk.bg} ${risk.text}`}>
                  {risk.icon} סיכון פיננסי: {risk.label}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-800 leading-relaxed">{advice.summary}</p>
          </div>

          {/* Forecast */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-1">
            <h2 className="text-sm font-semibold text-blue-700">📈 תחזית סוף החודש</h2>
            <p className="text-lg font-bold text-blue-800">
              {formatAgorot(advice.monthForecast.expectedExpensesAgorot)}
            </p>
            <p className="text-xs text-blue-600">{advice.monthForecast.note}</p>
          </div>

          {/* Saving opportunities */}
          {advice.savingOpportunities.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
              <h2 className="text-sm font-semibold text-gray-700">💰 הזדמנויות חיסכון</h2>
              <div className="space-y-3">
                {advice.savingOpportunities.map((op, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-gray-500">{op.categoryNameHe}</p>
                      <p className="text-sm text-gray-800">{op.suggestion}</p>
                    </div>
                    <span className="text-sm font-bold text-green-600 whitespace-nowrap">
                      חיסכון: {formatAgorot(op.estimatedSavingAgorot)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Spending permissions */}
          {advice.spendingPermissions.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
              <h2 className="text-sm font-semibold text-gray-700">✅ מותר לך לבזבז יותר</h2>
              <div className="space-y-3">
                {advice.spendingPermissions.map((sp, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-gray-500">{sp.categoryNameHe}</p>
                      <p className="text-sm text-gray-800">{sp.suggestion}</p>
                    </div>
                    <span className="text-sm font-bold text-blue-600 whitespace-nowrap">
                      {formatAgorot(sp.estimatedBudgetAgorot)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* General advice */}
          {advice.generalAdvice.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-2">
              <h2 className="text-sm font-semibold text-gray-700">💡 טיפים כלליים</h2>
              <ul className="space-y-1.5">
                {advice.generalAdvice.map((tip, i) => (
                  <li key={i} className="text-sm text-gray-700 flex gap-2">
                    <span className="text-gray-400">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-xs text-gray-400 text-center">
            נוצר ב-{new Date(advice.generatedAt).toLocaleString('he-IL')}
          </p>
        </div>
      )}

      {/* Recategorize section */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2">
        <h3 className="text-sm font-semibold text-gray-700">סיווג מחדש עם AI</h3>
        <p className="text-xs text-gray-500">
          מפעיל את מנוע ה-AI לסיווג מחדש של כל העסקאות שלא עברו דריסה ידנית.
        </p>
        <button
          onClick={handleRecategorize}
          disabled={recatLoading}
          className="w-full border border-gray-300 bg-white text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-60"
        >
          {recatLoading ? 'מסווג...' : '🔄 סווג עסקאות מחדש'}
        </button>
        {recatMsg && (
          <p className="text-xs text-center text-gray-600">{recatMsg}</p>
        )}
      </div>
    </div>
  )
}
