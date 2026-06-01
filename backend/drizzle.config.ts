import { defineConfig } from 'drizzle-kit'
import { config } from 'dotenv'

config()

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
    ssl: { rejectUnauthorized: false },
  },
  verbose: true,
  strict: true,
})
