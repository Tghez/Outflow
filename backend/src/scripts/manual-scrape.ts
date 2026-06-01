/**
 * Manual scrape trigger — runs a full sync of all active accounts.
 * Usage: npm run scrape
 */
import { syncAllActiveAccounts } from '../services/sync.js'

console.log('[manual-scrape] Starting sync of all active accounts...')
syncAllActiveAccounts()
  .then(() => {
    console.log('[manual-scrape] Done.')
    process.exit(0)
  })
  .catch((err) => {
    console.error('[manual-scrape] Error:', err)
    process.exit(1)
  })
