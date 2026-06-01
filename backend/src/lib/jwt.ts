import jwt from 'jsonwebtoken'
import { config } from '../config.js'

interface TokenPayload {
  userId: string
  email: string
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: '30d' })
}

export function verifyToken(token: string): TokenPayload {
  const decoded = jwt.verify(token, config.jwtSecret)
  if (typeof decoded === 'string') throw new Error('Invalid token')
  return decoded as TokenPayload
}
