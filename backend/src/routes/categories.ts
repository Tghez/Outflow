import { Router } from 'express'
import { z } from 'zod'
import { eq, or, isNull, and } from 'drizzle-orm'
import { db } from '../db/client.js'
import { categories, categoryRules } from '../db/schema.js'
import { apiSuccess, apiError } from '../lib/response.js'
import { requireAuth } from '../middleware/auth.js'
import { validateBody } from '../middleware/validate.js'

export const categoriesRouter = Router()
categoriesRouter.use(requireAuth)

categoriesRouter.get('/', async (req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(categories)
      .where(or(isNull(categories.userId), eq(categories.userId, req.userId)))
      .orderBy(categories.isSystem, categories.nameHe)

    apiSuccess(res, rows)
  } catch (err) {
    next(err)
  }
})

const createCategorySchema = z.object({
  nameHe: z.string().min(1).max(100),
  icon: z.string().min(1).max(10).default('💳'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#9ca3af'),
})

categoriesRouter.post('/', validateBody(createCategorySchema), async (req, res, next) => {
  try {
    const { nameHe, icon, color } = req.body as z.infer<typeof createCategorySchema>

    const [category] = await db
      .insert(categories)
      .values({
        id: `cat-user-${Date.now()}`,
        userId: req.userId,
        nameHe,
        icon,
        color,
        isSystem: false,
      })
      .returning()

    apiSuccess(res, category, 201)
  } catch (err) {
    next(err)
  }
})

const patchCategorySchema = z.object({
  nameHe: z.string().min(1).max(100).optional(),
  icon: z.string().min(1).max(10).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
}).refine((d) => Object.keys(d).length > 0, 'At least one field required')

categoriesRouter.patch('/:id', validateBody(patchCategorySchema), async (req, res, next) => {
  try {
    const [existing] = await db
      .select()
      .from(categories)
      .where(and(eq(categories.id, req.params.id), eq(categories.userId, req.userId)))

    if (!existing) {
      apiError(res, 'Category not found or not editable', 404, 'NOT_FOUND')
      return
    }

    const [updated] = await db
      .update(categories)
      .set(req.body)
      .where(eq(categories.id, req.params.id))
      .returning()

    apiSuccess(res, updated)
  } catch (err) {
    next(err)
  }
})

// ─── Category Rules sub-resource ─────────────────────────────────────────────

categoriesRouter.get('/rules', async (req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(categoryRules)
      .where(or(isNull(categoryRules.userId), eq(categoryRules.userId, req.userId)))
      .orderBy(categoryRules.priority, categoryRules.isSystem)

    apiSuccess(res, rows)
  } catch (err) {
    next(err)
  }
})

const createRuleSchema = z.object({
  categoryId: z.string().min(1),
  pattern: z.string().min(1),
  patternType: z.enum(['keyword', 'regex', 'startsWith', 'contains']),
  priority: z.number().int().default(0),
})

categoriesRouter.post('/rules', validateBody(createRuleSchema), async (req, res, next) => {
  try {
    const { categoryId, pattern, patternType, priority } = req.body as z.infer<typeof createRuleSchema>

    const [rule] = await db
      .insert(categoryRules)
      .values({
        id: `rule-user-${Date.now()}`,
        userId: req.userId,
        categoryId,
        pattern,
        patternType,
        priority,
        isSystem: false,
      })
      .returning()

    apiSuccess(res, rule, 201)
  } catch (err) {
    next(err)
  }
})

categoriesRouter.delete('/rules/:id', async (req, res, next) => {
  try {
    const deleted = await db
      .delete(categoryRules)
      .where(and(eq(categoryRules.id, req.params.id), eq(categoryRules.userId, req.userId)))
      .returning({ id: categoryRules.id })

    if (deleted.length === 0) {
      apiError(res, 'Rule not found', 404, 'NOT_FOUND')
      return
    }

    apiSuccess(res, { deleted: true })
  } catch (err) {
    next(err)
  }
})
