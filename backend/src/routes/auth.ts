import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '../db/client.js'
import { users } from '../db/schema.js'
import { signToken } from '../lib/jwt.js'
import { apiSuccess, apiError } from '../lib/response.js'
import { requireAuth } from '../middleware/auth.js'
import { validateBody } from '../middleware/validate.js'

export const authRouter = Router()

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(1).max(255).optional(),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

authRouter.post('/register', validateBody(registerSchema), async (req, res, next) => {
  try {
    const { email, password, displayName } = req.body as z.infer<typeof registerSchema>

    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email.toLowerCase()))

    if (existing.length > 0) {
      apiError(res, 'Email already registered', 409, 'EMAIL_TAKEN')
      return
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const [user] = await db
      .insert(users)
      .values({ email: email.toLowerCase(), passwordHash, displayName: displayName ?? null })
      .returning({ id: users.id, email: users.email, displayName: users.displayName, createdAt: users.createdAt })

    const token = signToken({ userId: user.id, email: user.email })
    apiSuccess(res, { token, user }, 201)
  } catch (err) {
    next(err)
  }
})

authRouter.post('/login', validateBody(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body as z.infer<typeof loginSchema>

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))

    if (!user) {
      apiError(res, 'Invalid credentials', 401, 'INVALID_CREDENTIALS')
      return
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      apiError(res, 'Invalid credentials', 401, 'INVALID_CREDENTIALS')
      return
    }

    const token = signToken({ userId: user.id, email: user.email })
    apiSuccess(res, {
      token,
      user: { id: user.id, email: user.email, displayName: user.displayName, createdAt: user.createdAt },
    })
  } catch (err) {
    next(err)
  }
})

authRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const [user] = await db
      .select({ id: users.id, email: users.email, displayName: users.displayName, createdAt: users.createdAt })
      .from(users)
      .where(eq(users.id, req.userId))

    if (!user) {
      apiError(res, 'User not found', 404, 'NOT_FOUND')
      return
    }

    apiSuccess(res, user)
  } catch (err) {
    next(err)
  }
})
