import { Router } from 'express'
import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { db } from '../db/client.js'
import { accounts } from '../db/schema.js'
import { encrypt, decrypt } from '../lib/crypto.js'
import { apiSuccess, apiError } from '../lib/response.js'
import { requireAuth } from '../middleware/auth.js'
import { validateBody } from '../middleware/validate.js'
import { queueSync, getSyncStatus } from '../services/sync.js'

export const accountsRouter = Router()
accountsRouter.use(requireAuth)

const addAccountSchema = z.object({
  companyId: z.string().min(1),
  accountName: z.string().min(1).max(255),
  credentials: z.record(z.string()),
})

accountsRouter.get('/', async (req, res, next) => {
  try {
    const rows = await db
      .select({
        id: accounts.id,
        companyId: accounts.companyId,
        accountName: accounts.accountName,
        lastSyncAt: accounts.lastSyncAt,
        syncStatus: accounts.syncStatus,
        isActive: accounts.isActive,
        createdAt: accounts.createdAt,
      })
      .from(accounts)
      .where(and(eq(accounts.userId, req.userId), eq(accounts.isActive, true)))

    apiSuccess(res, rows)
  } catch (err) {
    next(err)
  }
})

accountsRouter.post('/', validateBody(addAccountSchema), async (req, res, next) => {
  try {
    const { companyId, accountName, credentials } = req.body as z.infer<typeof addAccountSchema>

    const encryptedCredentials = encrypt(JSON.stringify(credentials))

    const [account] = await db
      .insert(accounts)
      .values({
        userId: req.userId,
        companyId,
        accountName,
        encryptedCredentials,
        isActive: true,
      })
      .returning({
        id: accounts.id,
        companyId: accounts.companyId,
        accountName: accounts.accountName,
        lastSyncAt: accounts.lastSyncAt,
        isActive: accounts.isActive,
        createdAt: accounts.createdAt,
      })

    apiSuccess(res, account, 201)
  } catch (err) {
    next(err)
  }
})

accountsRouter.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await db
      .delete(accounts)
      .where(and(eq(accounts.id, req.params.id), eq(accounts.userId, req.userId)))
      .returning({ id: accounts.id })

    if (deleted.length === 0) {
      apiError(res, 'Account not found', 404, 'NOT_FOUND')
      return
    }

    apiSuccess(res, { deleted: true })
  } catch (err) {
    next(err)
  }
})

accountsRouter.post('/:id/sync', async (req, res, next) => {
  try {
    const [account] = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.id, req.params.id), eq(accounts.userId, req.userId)))

    if (!account) {
      apiError(res, 'Account not found', 404, 'NOT_FOUND')
      return
    }

    const syncId = queueSync(account.id, req.userId)
    apiSuccess(res, { queued: true, syncId })
  } catch (err) {
    next(err)
  }
})

accountsRouter.get('/:id/sync-status', async (req, res, next) => {
  try {
    const syncId = req.query.syncId as string
    if (!syncId) {
      apiError(res, 'syncId query param required', 400)
      return
    }
    const status = getSyncStatus(syncId)
    apiSuccess(res, status)
  } catch (err) {
    next(err)
  }
})

export { decrypt }
