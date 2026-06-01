interface Props {
  icon: string
  nameHe: string
  color: string
  size?: 'sm' | 'md'
}

export function CategoryBadge({ icon, nameHe, color, size = 'md' }: Props) {
  const sizeClass = size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1'
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${sizeClass}`}
      style={{ backgroundColor: `${color}20`, color }}
    >
      <span>{icon}</span>
      <span>{nameHe}</span>
    </span>
  )
}
