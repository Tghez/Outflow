import express from 'express'
import cors from 'cors'
import { authRouter } from './routes/auth.js'
import { accountsRouter } from './routes/accounts.js'
import { transactionsRouter } from './routes/transactions.js'
import { categoriesRouter } from './routes/categories.js'
import { budgetsRouter } from './routes/budgets.js'
import { insightsRouter } from './routes/insights.js'
import { aiRouter } from './routes/ai.js'
import { errorHandler } from './middleware/errorHandler.js'

export function createApp() {
  const app = express()

  app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3000'] }))
  app.use(express.json())

  app.get('/health', (_req, res) => res.json({ ok: true }))

  app.use('/api/auth', authRouter)
  app.use('/api/accounts', accountsRouter)
  app.use('/api/transactions', transactionsRouter)
  app.use('/api/categories', categoriesRouter)
  app.use('/api/budgets', budgetsRouter)
  app.use('/api/insights', insightsRouter)
  app.use('/api/ai', aiRouter)

  app.use(errorHandler)

  return app
}
