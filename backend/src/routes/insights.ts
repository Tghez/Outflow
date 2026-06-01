import { Router } from 'express'
import { z } from 'zod'
import { apiSuccess, apiError } from '../lib/response.js'
import { requireAuth } from '../middleware/auth.js'
import { validateQuery } from '../middleware/validate.js'
import { getMonthlyTotals, getCategoryBreakdown } from '../services/insights.js'

export const insightsRouter = Router()
insightsRouter.use(requireAuth)

const monthlyQuerySchema = z.object({
  months: z.coerce.number().int().min(1).max(12).default(4),
})

insightsRouter.get('/monthly', validateQuery(monthlyQuerySchema), async (req, res, next) => {
  try {
    const { months } = req.query as unknown as z.infer<typeof monthlyQuerySchema>
    const data = await getMonthlyTotals(req.userId, months)
    apiSuccess(res, data)
  } catch (err) {
    next(err)
  }
})

insightsRouter.get('/categories/:month', async (req, res, next) => {
  try {
    const { month } = req.params
    if (!/^\d{4}-\d{2}$/.test(month)) {
      apiError(res, 'month must be YYYY-MM', 400)
      return
    }
    const data = await getCategoryBreakdown(req.userId, month)
    apiSuccess(res, data)
  } catch (err) {
    next(err)
  }
})
