import { randomUUID } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { sql } from 'drizzle-orm'
import { db } from './client.js'
import { users, accounts, transactions, budgets } from './schema.js'
import { encrypt } from '../lib/crypto.js'
import { floatToAgorot } from '@outflow/shared'

// ─── Category IDs (must match seed.ts system categories) ────────────────────
const CAT = {
  SUPERMARKET: 'cat-supermarket-0001',
  RESTAURANTS: 'cat-restaurants-0002',
  COFFEE:      'cat-coffee-000003',
  CLOTHING:    'cat-clothing-00004',
  RENT:        'cat-rent-000005',
  CAR:         'cat-car-0000006',
  HEALTH:      'cat-health-000007',
  ENTERTAINMENT: 'cat-entertain-0008',
  UTILITIES:   'cat-utilities-0009',
  EDUCATION:   'cat-education-0010',
  TRAVEL:      'cat-travel-000011',
  SHOPPING:    'cat-shopping-0012',
  OTHER:       'cat-other-000013',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ago(ilsFloat: number): number {
  return floatToAgorot(ilsFloat)
}

/** Positive = income, negative = expense (matches chargedAmount convention) */
function expense(ils: number): number { return -ago(ils) }
function income(ils: number): number  { return ago(ils) }

/** Returns base ± ~15%, always positive */
function slight(base: number): number {
  return Math.round(base * (0.85 + Math.random() * 0.3))
}

function monthDate(monthsAgo: number, day: number): string {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() - monthsAgo)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(Math.min(day, 28)).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${dd}`
}

function txn(
  accountId: string,
  monthsAgo: number,
  day: number,
  description: string,
  ils: number,
  categoryId: string,
): typeof transactions.$inferInsert {
  const chargedAmountAgorot = ils < 0 ? expense(-ils) : income(ils)
  const date = monthDate(monthsAgo, day)
  return {
    id: randomUUID(),
    accountId,
    date,
    processedDate: date,
    description,
    rawDescription: description,
    chargedAmountAgorot,
    originalAmountAgorot: Math.abs(chargedAmountAgorot),
    originalCurrency: 'ILS',
    categoryId,
    categoryOverriddenByUser: false,
    identifier: `demo-${date}-${description.slice(0, 20)}-${Math.abs(chargedAmountAgorot)}`,
    status: 'completed',
    type: 'normal',
  }
}

// ─── Demo transactions per month ─────────────────────────────────────────────

function buildMonthTransactions(accountId: string, monthsAgo: number) {
  return [
    // Income (positive)
    txn(accountId, monthsAgo, 1,  'משכורת - חברת הייטק בע"מ',      18500, CAT.OTHER),
    monthsAgo % 2 === 0
      ? txn(accountId, monthsAgo, 15, 'פרויקט פרילנס - שירותי ייעוץ', 3200, CAT.OTHER)
      : null,

    // Rent (negative = expense)
    txn(accountId, monthsAgo, 2,  'שכר דירה',                       -slight(4800), CAT.RENT),

    // Supermarket
    txn(accountId, monthsAgo, 3,  'שופרסל אונליין',                 -slight(380), CAT.SUPERMARKET),
    txn(accountId, monthsAgo, 8,  'רמי לוי - סניף הרצליה',          -slight(290), CAT.SUPERMARKET),
    txn(accountId, monthsAgo, 14, 'מגה בעיר',                       -slight(220), CAT.SUPERMARKET),
    txn(accountId, monthsAgo, 21, 'ויקטורי מרכז',                   -slight(310), CAT.SUPERMARKET),

    // Restaurants
    txn(accountId, monthsAgo, 6,  'מסעדת בוקה - תל אביב',           -slight(180), CAT.RESTAURANTS),
    txn(accountId, monthsAgo, 13, 'וולט - הזמנת אוכל',              -slight(95),  CAT.RESTAURANTS),
    txn(accountId, monthsAgo, 19, 'פיצה האט',                       -slight(120), CAT.RESTAURANTS),
    txn(accountId, monthsAgo, 24, 'מקדונלדס - אשדוד',               -slight(65),  CAT.RESTAURANTS),

    // Coffee
    txn(accountId, monthsAgo, 4,  'ארומה אספרסו בר',                -slight(38),  CAT.COFFEE),
    txn(accountId, monthsAgo, 10, 'קפה גרג',                         -slight(32),  CAT.COFFEE),
    txn(accountId, monthsAgo, 17, 'STARBUCKS רמת אביב',              -slight(55),  CAT.COFFEE),
    txn(accountId, monthsAgo, 23, 'ג׳ו קפה',                         -slight(29),  CAT.COFFEE),

    // Car
    txn(accountId, monthsAgo, 5,  'פנגו - חניה',                     -slight(45),  CAT.CAR),
    txn(accountId, monthsAgo, 12, 'דלק - תחנת מנחם בגין',           -slight(280), CAT.CAR),
    monthsAgo === 1
      ? txn(accountId, monthsAgo, 20, 'מוסך גיל - טיפול רכב',       -1400,        CAT.CAR)
      : null,

    // Utilities
    txn(accountId, monthsAgo, 7,  'חברת חשמל לישראל',               -slight(320), CAT.UTILITIES),
    txn(accountId, monthsAgo, 9,  'HOT - ערוצי טלוויזיה',            -slight(180), CAT.UTILITIES),
    txn(accountId, monthsAgo, 11, 'YES - דמי מנוי',                  -slight(220), CAT.UTILITIES),

    // Health
    txn(accountId, monthsAgo, 15, 'מכבי שירותי בריאות',             -slight(110), CAT.HEALTH),
    monthsAgo === 2
      ? txn(accountId, monthsAgo, 22, 'בית מרקחת סופר-פארם',        -slight(95),  CAT.HEALTH)
      : null,

    // Entertainment
    txn(accountId, monthsAgo, 18, 'YES PLANET - כרטיסי קולנוע',     -slight(96),  CAT.ENTERTAINMENT),
    txn(accountId, monthsAgo, 25, 'NETFLIX - מנוי חודשי',            -slight(60),  CAT.ENTERTAINMENT),

    // Education
    monthsAgo <= 2
      ? txn(accountId, monthsAgo, 16, 'Udemy - קורס React Advanced', -slight(150), CAT.EDUCATION)
      : null,

    // Online Shopping
    txn(accountId, monthsAgo, 20, 'AMAZON - הזמנה',                 -slight(240), CAT.SHOPPING),
    monthsAgo === 0
      ? txn(accountId, monthsAgo, 10, 'ALIEXPRESS',                   -slight(75),  CAT.SHOPPING)
      : null,

    // Clothing (occasional)
    monthsAgo === 1
      ? txn(accountId, monthsAgo, 22, 'זארה - קניון ג׳נסן',          -slight(450), CAT.CLOTHING)
      : null,
    monthsAgo === 3
      ? txn(accountId, monthsAgo, 14, 'H&M - קניון עזריאלי',         -slight(280), CAT.CLOTHING)
      : null,

    // Travel (occasional)
    monthsAgo === 3
      ? txn(accountId, monthsAgo, 28, 'EL AL - כרטיס טיסה',          -3200,        CAT.TRAVEL)
      : null,
  ].filter(Boolean) as (typeof transactions.$inferInsert)[]
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function seedDemo() {
  console.log('🌱 Seeding demo data...')

  // 1. Demo user
  const existingUser = await db.execute(
    sql`SELECT id FROM users WHERE email = 'demo@outflow.app' LIMIT 1`,
  )
  let userId: string

  if (existingUser.rows.length > 0) {
    userId = (existingUser.rows[0] as { id: string }).id
    console.log(`Demo user already exists (id=${userId}). Skipping user creation.`)
  } else {
    const passwordHash = await bcrypt.hash('Demo1234!', 10)
    const [newUser] = await db
      .insert(users)
      .values({ email: 'demo@outflow.app', passwordHash, displayName: 'משתמש דמו' })
      .returning({ id: users.id })
    userId = newUser.id
    console.log(`Created demo user (id=${userId})`)
  }

  // 2. Demo account
  const existingAccount = await db.execute(
    sql`SELECT id FROM accounts WHERE user_id = ${userId} AND account_name = 'חשבון עו"ש - דמו' LIMIT 1`,
  )
  let accountId: string

  if (existingAccount.rows.length > 0) {
    accountId = (existingAccount.rows[0] as { id: string }).id
    console.log(`Demo account already exists (id=${accountId}).`)
  } else {
    const dummyCredentials = encrypt(JSON.stringify({ username: 'demo', password: 'demo' }))
    const [newAccount] = await db
      .insert(accounts)
      .values({
        userId,
        companyId: 'hapoalim',
        accountName: 'חשבון עו"ש - דמו',
        encryptedCredentials: dummyCredentials,
        syncStatus: 'idle',
        isActive: true,
      })
      .returning({ id: accounts.id })
    accountId = newAccount.id
    console.log(`Created demo account (id=${accountId})`)
  }

  // 3. Transactions — 4 months (current month partial + 3 full months back)
  const allTxns: (typeof transactions.$inferInsert)[] = []
  for (let m = 0; m <= 3; m++) {
    allTxns.push(...buildMonthTransactions(accountId, m))
  }

  let inserted = 0
  const CHUNK = 50
  for (let i = 0; i < allTxns.length; i += CHUNK) {
    const chunk = allTxns.slice(i, i + CHUNK)
    const result = await db
      .insert(transactions)
      .values(chunk)
      .onConflictDoNothing()
      .returning({ id: transactions.id })
    inserted += result.length
  }
  console.log(`Inserted ${inserted} transactions (${allTxns.length - inserted} already existed)`)

  // 4. Sample budgets for the current month
  const now = new Date()
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split('T')[0]

  const sampleBudgets = [
    { categoryId: CAT.SUPERMARKET, targetAmountAgorot: ago(1500) },
    { categoryId: CAT.RESTAURANTS, targetAmountAgorot: ago(600) },
    { categoryId: CAT.COFFEE,      targetAmountAgorot: ago(200) },
    { categoryId: CAT.CAR,         targetAmountAgorot: ago(500) },
    { categoryId: CAT.ENTERTAINMENT, targetAmountAgorot: ago(300) },
    { categoryId: CAT.SHOPPING,    targetAmountAgorot: ago(400) },
  ]

  for (const b of sampleBudgets) {
    await db
      .insert(budgets)
      .values({ userId, ...b, month: currentMonthStart })
      .onConflictDoNothing()
  }
  console.log(`Upserted ${sampleBudgets.length} sample budgets`)

  console.log('\n✅ Demo seed complete!')
  console.log('   Email:    demo@outflow.app')
  console.log('   Password: Demo1234!')
  process.exit(0)
}

seedDemo().catch((err) => {
  console.error('Demo seed failed:', err)
  process.exit(1)
})
