import { getBudgetStatus } from '@outflow/shared'

const colors = {
  green: 'bg-green-500',
  amber: 'bg-amber-400',
  red: 'bg-red-500',
}

interface Props {
  ratio: number
  className?: string
}

export function ProgressBar({ ratio, className = '' }: Props) {
  const status = getBudgetStatus(ratio)
  const pct = Math.min(ratio * 100, 100)

  return (
    <div className={`w-full bg-gray-200 rounded-full h-2.5 ${className}`}>
      <div
        className={`h-2.5 rounded-full transition-all duration-300 ${colors[status]}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
