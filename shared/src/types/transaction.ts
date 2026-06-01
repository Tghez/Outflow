export type TransactionStatus = 'completed' | 'pending'
export type TransactionType = 'normal' | 'installments'

export interface Transaction {
  id: string
  accountId: string
  date: string
  processedDate: string | null
  description: string
  rawDescription: string
  chargedAmountAgorot: number
  originalAmountAgorot: number | null
  originalCurrency: string | null
  categoryId: string | null
  categoryOverriddenByUser: boolean
  identifier: string
  status: TransactionStatus
  type: TransactionType
  installmentNumber: number | null
  installmentTotal: number | null
}
