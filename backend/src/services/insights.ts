import { sql } from 'drizzle-orm'
import { db } from '../db/client.js'
import type { MonthlyTotal, CategoryBreakdown } from '@outflow/shared'
import { calcChangePercent } from '@outflow/shared'

export async function getMonthlyTotals(userId: string, monthsBack: number): Promise<MonthlyTotal[]> {
  const rows = await db.execute<{
    month: string
    income_agorot: string
    expenses_agorot: string
  }>(sql`
    SELECT
      TO_CHAR(DATE_TRUNC('month', t.date::date), 'YYYY-MM') AS month,
      COALESCE(SUM(t.charged_amount_agorot) FILTER (WHERE t.charged_amount_agorot > 0), 0) AS income_agorot,
      COALESCE(SUM(t.charged_amount_agorot) FILTER (WHERE t.charged_amount_agorot < 0), 0) * -1 AS expenses_agorot
    FROM transactions t
    JOIN accounts a ON a.id = t.account_id
    WHERE a.user_id = ${userId}
      AND t.date::date >= DATE_TRUNC('month', NOW() - (${monthsBack - 1} || ' months')::interval)
    GROUP BY DATE_TRUNC('month', t.date::date)
    ORDER BY DATE_TRUNC('month', t.date::date) ASC
  `)

  return rows.rows.map((r) => ({
    month: r.month,
    incomeAgorot: Number(r.income_agorot),
    expensesAgorot: Number(r.expenses_agorot),
  }))
}

export async function getCategoryBreakdown(userId: string, month: string): Promise<CategoryBreakdown[]> {
  const [year, mon] = month.split('-').map(Number)
  const currentStart = new Date(year, mon - 1, 1).toISOString().split('T')[0]
  const nextStart = new Date(year, mon, 1).toISOString().split('T')[0]
  const prevStart = new Date(year, mon - 2, 1).toISOString().split('T')[0]

  const rows = await db.execute<{
    category_id: string
    name_he: string
    icon: string
    color: string
    month_label: string
    total_agorot: string
  }>(sql`
    SELECT
      c.id AS category_id,
      c.name_he,
      c.icon,
      c.color,
      TO_CHAR(DATE_TRUNC('month', t.date::date), 'YYYY-MM') AS month_label,
      SUM(t.charged_amount_agorot) * -1 AS total_agorot
    FROM transactions t
    JOIN accounts a ON a.id = t.account_id
    JOIN categories c ON c.id = t.category_id
    WHERE a.user_id = ${userId}
      AND t.charged_amount_agorot < 0
      AND t.date::date >= ${prevStart}::date
      AND t.date::date < ${nextStart}::date
    GROUP BY c.id, c.name_he, c.icon, c.color, DATE_TRUNC('month', t.date::date)
    ORDER BY c.name_he, month_label
  `)

  // Group by category, then split current vs prev month
  const map = new Map<string, {
    categoryId: string
    nameHe: string
    icon: string
    color: string
    current: number | null
    prev: number | null
  }>()

  for (const row of rows.rows) {
    if (!map.has(row.category_id)) {
      map.set(row.category_id, {
        categoryId: row.category_id,
        nameHe: row.name_he,
        icon: row.icon,
        color: row.color,
        current: null,
        prev: null,
      })
    }
    const entry = map.get(row.category_id)!
    const amount = Number(row.total_agorot)
    if (row.month_label === month) {
      entry.current = amount
    } else {
      entry.prev = amount
    }
  }

  return Array.from(map.values())
    .filter((e) => e.current !== null)
    .map((e) => ({
      categoryId: e.categoryId,
      nameHe: e.nameHe,
      icon: e.icon,
      color: e.color,
      totalAgorot: e.current!,
      prevMonthAgorot: e.prev,
      changePercent: calcChangePercent(e.current!, e.prev),
    }))
    .sort((a, b) => b.totalAgorot - a.totalAgorot)
}
