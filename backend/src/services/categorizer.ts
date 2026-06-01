import { and, isNull, or, eq } from 'drizzle-orm'
import { db } from '../db/client.js'
import { categoryRules } from '../db/schema.js'
import { OTHER_CATEGORY_ID } from '@outflow/shared'
import { llmCategorizeBatch } from './llm-categorizer.js'

interface Rule {
  categoryId: string
  pattern: string
  patternType: string
  priority: number
  isSystem: boolean
}

// In-memory cache: userId → { rules, expiresAt }
const ruleCache = new Map<string, { rules: Rule[]; expiresAt: number }>()
const CACHE_TTL = 60_000

async function loadUserRules(userId: string): Promise<Rule[]> {
  const now = Date.now()
  const cached = ruleCache.get(userId)
  if (cached && cached.expiresAt > now) return cached.rules

  // Only load user-defined rules (isSystem = false) — system keyword rules are bypassed in favour of LLM
  const rows = await db
    .select({
      categoryId: categoryRules.categoryId,
      pattern: categoryRules.pattern,
      patternType: categoryRules.patternType,
      priority: categoryRules.priority,
      isSystem: categoryRules.isSystem,
    })
    .from(categoryRules)
    .where(
      and(
        or(isNull(categoryRules.userId), eq(categoryRules.userId, userId)),
        eq(categoryRules.isSystem, false),
      ),
    )
    .orderBy(categoryRules.priority)

  const sorted = [...rows].sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority
    return 0
  })

  ruleCache.set(userId, { rules: sorted, expiresAt: now + CACHE_TTL })
  return sorted
}

export function invalidateCache(userId: string): void {
  ruleCache.delete(userId)
}

function matches(description: string, rule: Rule): boolean {
  const desc = description.toLowerCase()
  const pat = rule.pattern.toLowerCase()

  switch (rule.patternType) {
    case 'contains':
      return desc.includes(pat)
    case 'startsWith':
      return desc.startsWith(pat)
    case 'keyword': {
      const escaped = pat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      return new RegExp(`\\b${escaped}\\b`, 'i').test(description)
    }
    case 'regex':
      try {
        return new RegExp(rule.pattern, 'i').test(description)
      } catch {
        return false
      }
    default:
      return false
  }
}

function matchUserRule(description: string, rules: Rule[]): string | null {
  for (const rule of rules) {
    if (matches(description, rule)) return rule.categoryId
  }
  return null
}

export async function assignCategory(description: string, userId: string): Promise<string> {
  const rules = await loadUserRules(userId)
  const fromRule = matchUserRule(description, rules)
  if (fromRule) return fromRule

  const [llmResult] = await llmCategorizeBatch([description], userId)
  return llmResult ?? OTHER_CATEGORY_ID
}

// User-rule pre-filter → LLM for unmatched. Preserves order.
export async function assignCategoriesBatch(
  descriptions: string[],
  userId: string,
): Promise<string[]> {
  const rules = await loadUserRules(userId)
  const results: (string | null)[] = descriptions.map((d) => matchUserRule(d, rules))

  const unresolvedIndices = results.map((r, i) => (r === null ? i : -1)).filter((i) => i >= 0)

  if (unresolvedIndices.length > 0) {
    const unresolvedDescriptions = unresolvedIndices.map((i) => descriptions[i])
    const llmResults = await llmCategorizeBatch(unresolvedDescriptions, userId)
    unresolvedIndices.forEach((origIdx, j) => {
      results[origIdx] = llmResults[j] ?? OTHER_CATEGORY_ID
    })
  }

  return results.map((r) => r ?? OTHER_CATEGORY_ID)
}
