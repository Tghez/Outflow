export interface Budget {
  id: string
  userId: string
  categoryId: string
  month: string
  targetAmountAgorot: number
}

export interface BudgetWithSpent extends Budget {
  nameHe: string
  icon: string
  color: string
  spentAgorot: number
}
