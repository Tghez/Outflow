import { ChatAnthropic } from '@langchain/anthropic'

function requireEnv(key: string): string {
  const val = process.env[key]
  if (!val) throw new Error(`Missing required env var: ${key}`)
  return val
}

export function getLlmFast(): ChatAnthropic {
  return new ChatAnthropic({
    apiKey: requireEnv('ANTHROPIC_API_KEY'),
    model: process.env.LLM_MODEL_FAST ?? 'claude-haiku-4-5-20251001',
    temperature: 0,
  })
}

export function getLlmSmart(): ChatAnthropic {
  return new ChatAnthropic({
    apiKey: requireEnv('ANTHROPIC_API_KEY'),
    model: process.env.LLM_MODEL_SMART ?? 'claude-sonnet-4-6',
    temperature: 0.3,
  })
}
