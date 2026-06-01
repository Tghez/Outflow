import { formatAgorot } from '@outflow/shared'

interface Props {
  agorot: number
  className?: string
  showSign?: boolean
}

export function AmountDisplay({ agorot, className = '', showSign = false }: Props) {
  const isExpense = agorot < 0
  const colorClass = isExpense ? 'text-red-600' : 'text-green-600'
  const formatted = formatAgorot(Math.abs(agorot))
  const display = showSign && !isExpense ? `+${formatted}` : formatted

  return <span className={`font-semibold tabular-nums ${colorClass} ${className}`}>{display}</span>
}
