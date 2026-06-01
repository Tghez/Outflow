import { isNull, or, eq } from 'drizzle-orm'
import { db } from '../db/client.js'
import { categories } from '../db/schema.js'
import { getLlmFast } from '../lib/llm.js'
import { categorizePrompt } from '../prompts/index.js'
import { OTHER_CATEGORY_ID } from '@outflow/shared'

interface CategoryInfo {
  id: string
  nameHe: string
  icon: string
}

// Cache categories per user for 5 minutes
const categoryCache = new Map<string, { list: CategoryInfo[]; expiresAt: number }>()
const CATEGORY_CACHE_TTL = 5 * 60_000

async function loadCategories(userId: string): Promise<CategoryInfo[]> {
  const now = Date.now()
  const cached = categoryCache.get(userId)
  if (cached && cached.expiresAt > now) return cached.list

  const rows = await db
    .select({ id: categories.id, nameHe: categories.nameHe, icon: categories.icon })
    .from(categories)
    .where(or(isNull(categories.userId), eq(categories.userId, userId)))

  categoryCache.set(userId, { list: rows, expiresAt: now + CATEGORY_CACHE_TTL })
  return rows
}

const CHUNK_SIZE = 50

export async function llmCategorizeBatch(
  descriptions: string[],
  userId: string,
): Promise<string[]> {
  if (descriptions.length === 0) return []

  const availableCategories = await loadCategories(userId)
  const categoriesJson = JSON.stringify(
    availableCategories.map((c) => ({ id: c.id, nameHe: c.nameHe, icon: c.icon })),
  )

  const results: string[] = new Array(descriptions.length).fill(OTHER_CATEGORY_ID)
  const llm = getLlmFast()
  const chain = categorizePrompt.pipe(llm)

  // Process in chunks to avoid token limits
  for (let start = 0; start < descriptions.length; start += CHUNK_SIZE) {
    const chunk = descriptions.slice(start, start + CHUNK_SIZE)
    const transactionsJson = JSON.stringify(
      chunk.map((desc, i) => ({ index: start + i, description: desc })),
    )

    try {
      const response = await chain.invoke({
        categories: categoriesJson,
        transactions: transactionsJson,
      })

      const text = typeof response.content === 'string' ? response.content : String(response.content)
      // Strip markdown code fences if present
      const cleaned = text.replace(/```(?:json)?\n?/g, '').trim()
      const parsed = JSON.parse(cleaned) as { index: number; categoryId: string }[]

      const validIds = new Set(availableCategories.map((c) => c.id))
      for (const item of parsed) {
        if (
          typeof item.index === 'number' &&
          item.index >= 0 &&
          item.index < descriptions.length &&
          typeof item.categoryId === 'string' &&
          validIds.has(item.categoryId)
        ) {
          results[item.index] = item.categoryId
        }
      }
    } catch (err) {
      console.error(`[llm-categorizer] chunk ${start} failed, using fallback:`, err)
      // results already filled with OTHER_CATEGORY_ID
    }
  }

  return results
}
