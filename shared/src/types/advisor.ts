export interface SavingOpportunity {
  categoryNameHe: string
  suggestion: string
  estimatedSavingAgorot: number
}

export interface SpendingPermission {
  categoryNameHe: string
  suggestion: string
  estimatedBudgetAgorot: number
}

export interface AdvisorAdvice {
  summary: string
  riskLevel: 'low' | 'medium' | 'high'
  monthForecast: {
    expectedExpensesAgorot: number
    note: string
  }
  savingOpportunities: SavingOpportunity[]
  spendingPermissions: SpendingPermission[]
  generalAdvice: string[]
  generatedAt: string
}
