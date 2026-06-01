import { config as dotenvConfig } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenvConfig({ path: resolve(__dirname, '../.env') })

function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

function validateEncryptionKey(key: string): void {
  const buf = Buffer.from(key, 'hex')
  if (buf.length !== 32) {
    throw new Error(
      `ENCRYPTION_KEY must be a 64-character hex string (32 bytes). Got ${buf.length} bytes. ` +
        'Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
    )
  }
}

const encryptionKey = required('ENCRYPTION_KEY')
validateEncryptionKey(encryptionKey)

export const config = {
  port: Number(process.env.PORT ?? 3001),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  databaseUrl: required('DATABASE_URL'),
  encryptionKey,
  jwtSecret: required('JWT_SECRET'),
  scraperTimeoutMs: Number(process.env.SCRAPER_TIMEOUT_MS ?? 120_000),
}
