export type BudgetStatus = 'green' | 'amber' | 'red'

export function getBudgetStatus(ratio: number): BudgetStatus {
  if (ratio >= 1.0) return 'red'
  if (ratio >= 0.8) return 'amber'
  return 'green'
}

export function calcChangePercent(
  current: number,
  prev: number | null,
): number | null {
  if (prev === null || prev === 0) return null
  return Math.round(((current - prev) / Math.abs(prev)) * 100)
}
