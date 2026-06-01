export type PatternType = 'keyword' | 'regex' | 'startsWith' | 'contains'

export interface Category {
  id: string
  userId: string | null
  nameHe: string
  icon: string
  color: string
  isSystem: boolean
}

export interface CategoryRule {
  id: string
  userId: string | null
  categoryId: string
  pattern: string
  patternType: PatternType
  priority: number
  isSystem: boolean
}
