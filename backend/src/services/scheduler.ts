import cron from 'node-cron'
import { syncAllActiveAccounts } from './sync.js'

export function startScheduler(): void {
  // Daily at 02:00 — sequential syncs, no parallel browser instances
  cron.schedule('0 2 * * *', async () => {
    console.log('[scheduler] Starting daily sync...')
    try {
      await syncAllActiveAccounts()
      console.log('[scheduler] Daily sync complete.')
    } catch (err) {
      console.error('[scheduler] Daily sync failed:', err)
    }
  })

  console.log('[scheduler] Daily sync scheduled for 02:00')
}
