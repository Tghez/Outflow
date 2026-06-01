import { Router } from 'express'
import { z } from 'zod'
import { eq, and, sql } from 'drizzle-orm'
import { db } from '../db/client.js'
import { budgets, categories, transactions, accounts } from '../db/schema.js'
import { apiSuccess, apiError } from '../lib/response.js'
import { requireAuth } from '../middleware/auth.js'
import { validateBody } from '../middleware/validate.js'

export const budgetsRouter = Router()
budgetsRouter.use(requireAuth)

function monthBounds(month: string): { start: string; end: string } {
  const [year, mon] = month.split('-').map(Number)
  const start = new Date(year, mon - 1, 1).toISOString().split('T')[0]
  const end = new Date(year, mon, 1).toISOString().split('T')[0]
  return { start, end }
}

budgetsRouter.get('/:month', async (req, res, next) => {
  try {
    const { month } = req.params
    if (!/^\d{4}-\d{2}$/.test(month)) {
      apiError(res, 'month must be YYYY-MM', 400)
      return
    }

    const { start, end } = monthBounds(month)

    const rows = await db.execute<{
      id: string
      category_id: string
      target_amount_agorot: number
      month: string
      name_he: string
      icon: string
      color: string
      spent_agorot: number
    }>(sql`
      SELECT
        b.id,
        b.category_id,
        b.target_amount_agorot,
        b.month,
        c.name_he,
        c.icon,
        c.color,
        COALESCE(
          SUM(t.charged_amount_agorot) FILTER (
            WHERE t.charged_amount_agorot < 0
              AND t.date >= ${start}::date
              AND t.date < ${end}::date
          ), 0
        ) * -1 AS spent_agorot
      FROM budgets b
      JOIN categories c ON c.id = b.category_id
      LEFT JOIN transactions t ON t.category_id = b.category_id
        AND t.account_id IN (
          SELECT id FROM accounts WHERE user_id = ${req.userId}
        )
      WHERE b.user_id = ${req.userId}
        AND b.month = ${start}::date
      GROUP BY b.id, b.category_id, b.target_amount_agorot, b.month, c.name_he, c.icon, c.color
      ORDER BY c.name_he
    `)

    const result = rows.rows.map((r) => ({
      id: r.id,
      categoryId: r.category_id,
      targetAmountAgorot: Number(r.target_amount_agorot),
      month: r.month,
      nameHe: r.name_he,
      icon: r.icon,
      color: r.color,
      spentAgorot: Number(r.spent_agorot),
    }))

    apiSuccess(res, result)
  } catch (err) {
    next(err)
  }
})

const upsertSchema = z.object({
  targetAmountAgorot: z.number().int().positive(),
})

budgetsRouter.put('/:month/:categoryId', validateBody(upsertSchema), async (req, res, next) => {
  try {
    const { month, categoryId } = req.params
    if (!/^\d{4}-\d{2}$/.test(month)) {
      apiError(res, 'month must be YYYY-MM', 400)
      return
    }

    const { start } = monthBounds(month)
    const { targetAmountAgorot } = req.body as z.infer<typeof upsertSchema>

    const [result] = await db
      .insert(budgets)
      .values({
        userId: req.userId,
        categoryId,
        month: start,
        targetAmountAgorot,
      })
      .onConflictDoUpdate({
        target: [budgets.userId, budgets.categoryId, budgets.month],
        set: { targetAmountAgorot },
      })
      .returning()

    apiSuccess(res, result)
  } catch (err) {
    next(err)
  }
})

budgetsRouter.delete('/:month/:categoryId', async (req, res, next) => {
  try {
    const { month, categoryId } = req.params
    const { start } = monthBounds(month)

    const deleted = await db
      .delete(budgets)
      .where(
        and(
          eq(budgets.userId, req.userId),
          eq(budgets.categoryId, categoryId),
          eq(budgets.month, start),
        ),
      )
      .returning({ id: budgets.id })

    if (deleted.length === 0) {
      apiError(res, 'Budget not found', 404, 'NOT_FOUND')
      return
    }

    apiSuccess(res, { deleted: true })
  } catch (err) {
    next(err)
  }
})
