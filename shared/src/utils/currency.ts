const formatter = new Intl.NumberFormat('he-IL', {
  style: 'currency',
  currency: 'ILS',
  maximumFractionDigits: 0,
})

export function formatAgorot(agorot: number): string {
  return formatter.format(agorot / 100)
}

export function agorotToFloat(agorot: number): number {
  return agorot / 100
}

export function floatToAgorot(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100)
}
