import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { config } from '../config.js'

interface Encrypted {
  iv: string
  tag: string
  ciphertext: string
}

export function encrypt(plaintext: string): Encrypted {
  const key = Buffer.from(config.encryptionKey, 'hex')
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])

  return {
    iv: iv.toString('hex'),
    tag: cipher.getAuthTag().toString('hex'),
    ciphertext: encrypted.toString('hex'),
  }
}

export function decrypt(encrypted: Encrypted): string {
  const key = Buffer.from(config.encryptionKey, 'hex')
  const iv = Buffer.from(encrypted.iv, 'hex')
  const tag = Buffer.from(encrypted.tag, 'hex')
  const ciphertext = Buffer.from(encrypted.ciphertext, 'hex')

  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)

  return decipher.update(ciphertext).toString('utf8') + decipher.final('utf8')
}
