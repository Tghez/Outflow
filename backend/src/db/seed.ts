import { sql } from 'drizzle-orm'
import { db } from './client.js'
import { categories, categoryRules } from './schema.js'
import {
  SYSTEM_CATEGORIES,
  SYSTEM_CATEGORY_RULES,
} from '@outflow/shared'

async function seed() {
  console.log('Seeding system categories...')

  const existing = await db
    .select({ id: categories.id })
    .from(categories)
    .where(sql`${categories.isSystem} = true`)

  if (existing.length > 0) {
    console.log(`Found ${existing.length} existing system categories. Skipping category seed.`)
  } else {
    await db.insert(categories).values(
      SYSTEM_CATEGORIES.map((c) => ({
        id: c.id,
        userId: null,
        nameHe: c.nameHe,
        icon: c.icon,
        color: c.color,
        isSystem: true,
      })),
    )
    console.log(`Inserted ${SYSTEM_CATEGORIES.length} system categories.`)
  }

  const existingRules = await db
    .select({ id: categoryRules.id })
    .from(categoryRules)
    .where(sql`${categoryRules.isSystem} = true`)

  if (existingRules.length > 0) {
    console.log(`Found ${existingRules.length} existing system rules. Skipping rule seed.`)
  } else {
    await db.insert(categoryRules).values(
      SYSTEM_CATEGORY_RULES.map((r) => ({
        id: r.id,
        userId: null,
        categoryId: r.categoryId,
        pattern: r.pattern,
        patternType: r.patternType,
        priority: r.priority,
        isSystem: true,
      })),
    )
    console.log(`Inserted ${SYSTEM_CATEGORY_RULES.length} system category rules.`)
  }

  console.log('Seed complete.')
  process.exit(0)
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
