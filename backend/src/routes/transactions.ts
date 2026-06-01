import { Router } from 'express'
import { z } from 'zod'
import { eq, and, gte, lt, sql } from 'drizzle-orm'
import { db } from '../db/client.js'
import { transactions, accounts } from '../db/schema.js'
import { apiSuccess, apiError } from '../lib/response.js'
import { requireAuth } from '../middleware/auth.js'
import { validateQuery, validateBody } from '../middleware/validate.js'

export const transactionsRouter = Router()
transactionsRouter.use(requireAuth)

const querySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  categoryId: z.string().optional(),
  accountId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
})

transactionsRouter.get('/', validateQuery(querySchema), async (req, res, next) => {
  try {
    const { month, categoryId, accountId, page, limit } = req.query as unknown as z.infer<typeof querySchema>

    // Build user's account ID subquery
    const userAccountIds = db
      .select({ id: accounts.id })
      .from(accounts)
      .where(eq(accounts.userId, req.userId))

    const conditions = [
      sql`${transactions.accountId} IN (${userAccountIds})`,
    ]

    if (month) {
      const [year, mon] = month.split('-').map(Number)
      const from = new Date(year, mon - 1, 1).toISOString().split('T')[0]
      const to = new Date(year, mon, 1).toISOString().split('T')[0]
      conditions.push(gte(transactions.date, from))
      conditions.push(lt(transactions.date, to))
    }

    if (categoryId) {
      conditions.push(eq(transactions.categoryId, categoryId))
    }

    if (accountId) {
      conditions.push(eq(transactions.accountId, accountId))
    }

    const where = and(...conditions)

    const [{ count }] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(transactions)
      .where(where)

    const rows = await db
      .select()
      .from(transactions)
      .where(where)
      .orderBy(sql`${transactions.date} DESC, ${transactions.createdAt} DESC`)
      .limit(limit)
      .offset((page - 1) * limit)

    apiSuccess(res, {
      data: rows,
      total: count,
      page,
      totalPages: Math.ceil(count / limit),
    })
  } catch (err) {
    next(err)
  }
})

const patchSchema = z.object({
  categoryId: z.string().min(1),
})

transactionsRouter.patch('/:id', validateBody(patchSchema), async (req, res, next) => {
  try {
    const { categoryId } = req.body as z.infer<typeof patchSchema>

    // Verify the transaction belongs to this user
    const [txn] = await db
      .select({ id: transactions.id, accountId: transactions.accountId })
      .from(transactions)
      .where(eq(transactions.id, req.params.id))

    if (!txn) {
      apiError(res, 'Transaction not found', 404, 'NOT_FOUND')
      return
    }

    const [acct] = await db
      .select({ id: accounts.id })
      .from(accounts)
      .where(and(eq(accounts.id, txn.accountId), eq(accounts.userId, req.userId)))

    if (!acct) {
      apiError(res, 'Transaction not found', 404, 'NOT_FOUND')
      return
    }

    const [updated] = await db
      .update(transactions)
      .set({ categoryId, categoryOverriddenByUser: true })
      .where(eq(transactions.id, req.params.id))
      .returning()

    apiSuccess(res, updated)
  } catch (err) {
    next(err)
  }
})
