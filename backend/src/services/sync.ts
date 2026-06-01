import { createHash, randomUUID } from 'node:crypto'
import { eq, and, sql } from 'drizzle-orm'
import { db } from '../db/client.js'
import { accounts, transactions } from '../db/schema.js'
import { decrypt } from '../lib/crypto.js'
import { scrapeAccount } from './scraper.js'
import { assignCategoriesBatch } from './categorizer.js'
import { floatToAgorot } from '@outflow/shared'

interface SyncStatus {
  state: 'pending' | 'running' | 'done' | 'error'
  message?: string
  syncedCount?: number
  finishedAt?: string
}

const syncStatuses = new Map<string, SyncStatus>()
const inProgressAccounts = new Set<string>()

export function queueSync(accountId: string, userId: string): string {
  const syncId = randomUUID()
  syncStatuses.set(syncId, { state: 'pending' })

  // Fire and forget
  void runSync(accountId, userId, syncId)

  return syncId
}

export function getSyncStatus(syncId: string): SyncStatus {
  return syncStatuses.get(syncId) ?? { state: 'pending' }
}

async function runSync(accountId: string, userId: string, syncId: string): Promise<void> {
  if (inProgressAccounts.has(accountId)) {
    syncStatuses.set(syncId, { state: 'error', message: 'Sync already in progress for this account' })
    return
  }

  inProgressAccounts.add(accountId)
  syncStatuses.set(syncId, { state: 'running' })

  try {
    await doSync(accountId, userId, syncId)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    syncStatuses.set(syncId, { state: 'error', message, finishedAt: new Date().toISOString() })
    console.error(`[sync] accountId=${accountId} error:`, message)
  } finally {
    inProgressAccounts.delete(accountId)
    // Clean up status after 5 minutes
    setTimeout(() => syncStatuses.delete(syncId), 5 * 60 * 1000)
  }
}

async function doSync(accountId: string, userId: string, syncId: string): Promise<void> {
  const [account] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)))

  if (!account) throw new Error('Account not found')

  // Decrypt credentials — never log
  const credentials = JSON.parse(
    decrypt(account.encryptedCredentials as { iv: string; tag: string; ciphertext: string }),
  ) as Record<string, string>

  // Determine start date: overlap 30 days if we have history, otherwise go back 90 days
  const startDate = account.lastSyncAt
    ? new Date(account.lastSyncAt.getTime() - 30 * 24 * 60 * 60 * 1000)
    : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

  await db
    .update(accounts)
    .set({ syncStatus: 'running' })
    .where(eq(accounts.id, accountId))

  const result = await scrapeAccount(account.companyId, credentials, startDate)

  if (!result.success) {
    await db
      .update(accounts)
      .set({ syncStatus: 'error', lastSyncAt: new Date() })
      .where(eq(accounts.id, accountId))
    syncStatuses.set(syncId, {
      state: 'error',
      message: result.errorMessage ?? 'Scraper returned failure',
      finishedAt: new Date().toISOString(),
    })
    return
  }

  const scraperAccounts = result.accounts ?? []
  let totalSynced = 0

  for (const scraperAccount of scraperAccounts) {
    const txns = scraperAccount.txns ?? []
    if (txns.length === 0) continue

    // Build rows with deterministic identifiers
    const rawDescriptions = txns.map((t) => t.description ?? '')
    const categoryIds = await assignCategoriesBatch(rawDescriptions, userId)

    const rows = txns.map((txn, i) => {
      const chargedAmountAgorot = floatToAgorot(txn.chargedAmount)
      const originalAmountAgorot = floatToAgorot(txn.originalAmount)
      const rawDate = txn.date?.split('T')[0] ?? new Date().toISOString().split('T')[0]
      const processedDate = txn.processedDate?.split('T')[0] ?? null

      const identifier = txn.identifier != null
        ? String(txn.identifier)
        : createHash('sha256')
            .update(`${accountId}|${rawDate}|${txn.description}|${chargedAmountAgorot}`)
            .digest('hex')
            .slice(0, 64)

      return {
        accountId,
        date: rawDate,
        processedDate,
        description: txn.description.trim(),
        rawDescription: txn.description,
        chargedAmountAgorot,
        originalAmountAgorot,
        originalCurrency: txn.originalCurrency ?? 'ILS',
        categoryId: categoryIds[i],
        categoryOverriddenByUser: false as const,
        identifier,
        status: (txn.status ?? 'completed') as 'completed' | 'pending',
        type: (txn.type ?? 'normal') as 'normal' | 'installments',
        installmentNumber: txn.installments?.number ?? null,
        installmentTotal: txn.installments?.total ?? null,
      }
    })

    // Upsert in chunks of 100
    for (let i = 0; i < rows.length; i += 100) {
      const chunk = rows.slice(i, i + 100)
      await db
        .insert(transactions)
        .values(chunk)
        .onConflictDoUpdate({
          target: [transactions.accountId, transactions.identifier],
          set: {
            status: sql`EXCLUDED.status`,
            processedDate: sql`EXCLUDED.processed_date`,
            // Preserve user's category override
            categoryId: sql`
              CASE WHEN ${transactions.categoryOverriddenByUser} THEN ${transactions.categoryId}
              ELSE EXCLUDED.category_id END
            `,
          },
        })
      totalSynced += chunk.length
    }
  }

  await db
    .update(accounts)
    .set({ lastSyncAt: new Date(), syncStatus: 'idle' })
    .where(eq(accounts.id, accountId))

  syncStatuses.set(syncId, {
    state: 'done',
    syncedCount: totalSynced,
    finishedAt: new Date().toISOString(),
  })

  console.log(`[sync] accountId=${accountId} synced ${totalSynced} transactions`)
}

// Called by the scheduler for all accounts
export async function syncAllActiveAccounts(): Promise<void> {
  const allAccounts = await db
    .select({ id: accounts.id, userId: accounts.userId })
    .from(accounts)
    .where(eq(accounts.isActive, true))

  for (const account of allAccounts) {
    const syncId = randomUUID()
    syncStatuses.set(syncId, { state: 'pending' })
    try {
      await doSync(account.id, account.userId, syncId)
    } catch (err) {
      console.error(`[scheduler] sync failed for account ${account.id}:`, err)
    }
  }
}
