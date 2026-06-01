export interface MonthlyTotal {
  month: string
  incomeAgorot: number
  expensesAgorot: number
}

export interface CategoryBreakdown {
  categoryId: string
  nameHe: string
  icon: string
  color: string
  totalAgorot: number
  prevMonthAgorot: number | null
  changePercent: number | null
}
