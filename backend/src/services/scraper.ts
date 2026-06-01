import { createScraper, CompanyTypes } from '@sergienko4/israeli-bank-scrapers'
import { config } from '../config.js'

export interface ScraperTransaction {
  type: string
  identifier?: string | number
  date: string
  processedDate?: string
  originalAmount: number
  originalCurrency: string
  chargedAmount: number
  description: string
  memo?: string | null
  status: string
  installments?: { number: number; total: number } | null
}

export interface ScraperAccount {
  accountNumber: string
  txns: ScraperTransaction[]
}

export interface ScraperResult {
  success: boolean
  accounts?: ScraperAccount[]
  errorType?: string
  errorMessage?: string
}

export async function scrapeAccount(
  companyId: string,
  credentials: Record<string, string>,
  startDate: Date,
): Promise<ScraperResult> {
  const scraper = createScraper({
    companyId: companyId as CompanyTypes,
    startDate,
    headless: true,
  })

  // Credentials are decrypted immediately before use and never logged
  try {
    const result = await scraper.scrape(credentials as Record<string, unknown>)
    return result as unknown as ScraperResult
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown scraper error'
    return {
      success: false,
      errorType: 'scraper_exception',
      errorMessage: message,
    }
  }
}
