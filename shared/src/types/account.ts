export type CompanyId =
  | 'hapoalim'
  | 'leumi'
  | 'beinleumi'
  | 'union'
  | 'discount'
  | 'mercantile'
  | 'mizrahi'
  | 'otsarHahayal'
  | 'massad'
  | 'pagi'
  | 'amex'
  | 'isracard'
  | 'visaCal'
  | 'max'
  | 'yahav'
  | 'behatsdaa'
  | 'beyahadBishvilha'
  | 'oneZero'

export const COMPANY_NAMES_HE: Record<CompanyId, string> = {
  hapoalim: 'בנק הפועלים',
  leumi: 'בנק לאומי',
  beinleumi: 'בנק הבינלאומי',
  union: 'בנק יובנק',
  discount: 'בנק דיסקונט',
  mercantile: 'בנק מרכנתיל',
  mizrahi: 'בנק מזרחי טפחות',
  otsarHahayal: 'בנק אוצר החייל',
  massad: 'בנק מסד',
  pagi: 'בנק פאגי',
  amex: 'אמריקן אקספרס',
  isracard: 'ישראכרט',
  visaCal: 'ויזה כאל',
  max: 'מקס',
  yahav: 'בנק יהב',
  behatsdaa: 'בהצדעה',
  beyahadBishvilha: 'ביחד בשבילך',
  oneZero: 'ONE ZERO',
}

export interface Account {
  id: string
  userId: string
  companyId: CompanyId
  accountName: string
  lastSyncAt: string | null
  isActive: boolean
}

// Per-company credential field names (what the scraper expects)
export const COMPANY_CREDENTIAL_FIELDS: Record<CompanyId, string[]> = {
  hapoalim: ['userCode', 'password'],
  leumi: ['username', 'password'],
  beinleumi: ['username', 'password'],
  union: ['username', 'password'],
  discount: ['id', 'password', 'num'],
  mercantile: ['id', 'password', 'num'],
  mizrahi: ['username', 'password'],
  otsarHahayal: ['username', 'password'],
  massad: ['username', 'password'],
  pagi: ['username', 'password'],
  amex: ['username', 'card6Digits', 'password'],
  isracard: ['id', 'card6Digits', 'password'],
  visaCal: ['username', 'password'],
  max: ['username', 'password'],
  yahav: ['username', 'password', 'nationalID'],
  behatsdaa: ['username', 'password'],
  beyahadBishvilha: ['username', 'password'],
  oneZero: ['email', 'password'],
}
