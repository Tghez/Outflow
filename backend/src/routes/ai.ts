import { Router } from 'express'
import { eq, and, inArray } from 'drizzle-orm'
import { db } from '../db/client.js'
import { accounts, transactions } from '../db/schema.js'
import { apiSuccess, apiError } from '../lib/response.js'
import { requireAuth } from '../middleware/auth.js'
import { runAdvisor } from '../services/advisor.js'
import { llmCategorizeBatch } from '../services/llm-categorizer.js'

export const aiRouter = Router()
aiRouter.use(requireAuth)

const CURRENT_MONTH = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

// GET /api/ai/advisor?month=YYYY-MM
aiRouter.get('/advisor', async (req, res, next) => {
  try {
    const month = typeof req.query.month === 'string' ? req.query.month : CURRENT_MONTH()
    if (!/^\d{4}-\d{2}$/.test(month)) {
      apiError(res, 'month must be YYYY-MM', 400)
      return
    }

    const advice = await runAdvisor(req.userId, month)
    apiSuccess(res, { advice })
  } catch (err) {
    next(err)
  }
})

// POST /api/ai/recategorize — re-runs LLM on all non-overridden transactions for the user
aiRouter.post('/recategorize', async (req, res, next) => {
  try {
    // Get all account IDs for this user
    const userAccounts = await db
      .select({ id: accounts.id })
      .from(accounts)
      .where(eq(accounts.userId, req.userId))

    if (userAccounts.length === 0) {
      apiSuccess(res, { updated: 0 })
      return
    }

    const accountIds = userAccounts.map((a) => a.id)

    // Fetch all non-overridden transactions
    const txns = await db
      .select({ id: transactions.id, description: transactions.description })
      .from(transactions)
      .where(
        and(
          inArray(transactions.accountId, accountIds),
          eq(transactions.categoryOverriddenByUser, false),
        ),
      )

    if (txns.length === 0) {
      apiSuccess(res, { updated: 0 })
      return
    }

    const descriptions = txns.map((t) => t.description)
    const categoryIds = await llmCategorizeBatch(descriptions, req.userId)

    // Bulk update in batches of 100
    const BATCH = 100
    let updated = 0
    for (let i = 0; i < txns.length; i += BATCH) {
      const chunk = txns.slice(i, i + BATCH)
      await Promise.all(
        chunk.map((txn, j) =>
          db
            .update(transactions)
            .set({ categoryId: categoryIds[i + j] })
            .where(eq(transactions.id, txn.id)),
        ),
      )
      updated += chunk.length
    }

    apiSuccess(res, { updated })
  } catch (err) {
    next(err)
  }
})
