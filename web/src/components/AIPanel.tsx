import { useState } from 'react'
import type { AdvisorAdvice } from '@outflow/shared'
import { formatAgorot } from '@outflow/shared'
import { getAdvisorAdvice } from '../api/ai.js'
import { Spinner } from './ui/Spinner.js'

function currentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function monthOptions() {
  const options = []
  const now = new Date()
  for (let i = 0; i < 4; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = new Intl.DateTimeFormat('he-IL', { month: 'long', year: 'numeric' }).format(d)
    options.push({ value, label })
  }
  return options
}

const RISK_LABELS: Record<string, string> = { low: 'נמוך', medium: 'בינוני', high: 'גבוה' }
const RISK_COLORS: Record<string, string> = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-brand-light text-brand-accent',
}

export function AIPanel() {
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState(currentMonth)
  const [advice, setAdvice] = useState<AdvisorAdvice | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const options = monthOptions()

  async function runAnalysis() {
    setLoading(true)
    setError('')
    try {
      const res = await getAdvisorAdvice(month)
      setAdvice(res.advice)
    } catch {
      setError('שגיאה בקבלת הניתוח')
    } finally {
      setLoading(false)
    }
  }

return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-5 w-14 h-14 rounded-full text-white flex items-center justify-center transition-colors"
        style={{ backgroundColor: '#E36A6A', zIndex: 9999, boxShadow: '0 4px 20px rgba(227,106,106,0.5)' }}
        aria-label="פתח יועץ AI"
      >
        <span className="flex items-end gap-1">
          <span className="ai-dot" />
          <span className="ai-dot" />
          <span className="ai-dot" />
        </span>
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-50 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Slide-in panel */}
      <div className={`ai-panel fixed top-0 right-0 h-full w-full max-w-sm shadow-2xl z-50 flex flex-col${open ? ' open' : ''}`} style={{ backgroundColor: '#FFFBF1' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-brand-light/50 bg-brand-surface">
          <button
            onClick={() => setOpen(false)}
            className="text-brand-muted hover:text-brand-text text-xl leading-none"
            aria-label="סגור"
          >
            ✕
          </button>
          <h2 className="font-bold text-brand-text text-lg">יועץ AI</h2>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Description */}
          <p className="text-sm text-brand-muted leading-relaxed">
            היועץ החכם שלך מנתח את ההוצאות, מזהה דפוסי בזבוז, ומציע הזדמנויות לחיסכון — הכל בהתאמה אישית לחודש שבחרת.
          </p>

          {/* Month selector */}
          <div>
            <label className="block text-xs font-semibold text-brand-muted mb-1">חודש לניתוח</label>
            <select
              value={month}
              onChange={(e) => { setMonth(e.target.value); setAdvice(null) }}
              className="w-full border border-brand-light rounded-xl px-3 py-2 text-sm bg-white text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-accent"
            >
              {options.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Run analysis button */}
          <button
            onClick={runAnalysis}
            disabled={loading}
            className="w-full py-3 bg-brand-accent rounded-xl font-semibold text-sm hover:bg-brand-dark disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
            style={{ color: '#2D1A1A' }}
          >
            {loading ? <><Spinner /> מנתח...</> : 'הפעל ניתוח'}
          </button>

          {error && (
            <p className="text-xs text-brand-accent bg-brand-light/30 rounded-lg p-3">{error}</p>
          )}

          {/* Advice results */}
          {advice && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="bg-brand-surface rounded-2xl p-4 border border-brand-light/50">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${RISK_COLORS[advice.riskLevel]}`}>
                    סיכון {RISK_LABELS[advice.riskLevel]}
                  </span>
                  <span className="text-xs font-semibold text-brand-muted">סיכום</span>
                </div>
                <p className="text-sm text-brand-text leading-relaxed">{advice.summary}</p>
              </div>

              {/* Forecast */}
              <div className="bg-white rounded-2xl p-4 border border-brand-light/50">
                <p className="text-xs font-semibold text-brand-muted mb-1">תחזית חודש</p>
                <p className="font-bold text-brand-accent text-lg">{formatAgorot(advice.monthForecast.expectedExpensesAgorot)}</p>
                <p className="text-xs text-brand-muted mt-1">{advice.monthForecast.note}</p>
              </div>

              {/* Saving opportunities */}
              {advice.savingOpportunities.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-brand-muted mb-2">הזדמנויות חיסכון</p>
                  <div className="space-y-2">
                    {advice.savingOpportunities.map((op, i) => (
                      <div key={i} className="bg-brand-surface rounded-xl p-3 border border-brand-light/40">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-brand-accent">{formatAgorot(op.estimatedSavingAgorot)}</span>
                          <span className="text-xs font-semibold text-brand-text">{op.categoryNameHe}</span>
                        </div>
                        <p className="text-xs text-brand-muted">{op.suggestion}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* General advice */}
              {advice.generalAdvice.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-brand-muted mb-2">טיפים כלליים</p>
                  <ul className="space-y-1.5">
                    {advice.generalAdvice.map((tip, i) => (
                      <li key={i} className="flex gap-2 text-xs text-brand-text">
                        <span className="text-brand-accent mt-0.5">◆</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="text-xs text-brand-muted/60 text-center">
                נוצר ב-{new Intl.DateTimeFormat('he-IL', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(advice.generatedAt))}
              </p>
            </div>
          )}

        </div>
      </div>
    </>
  )
}
