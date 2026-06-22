import Anthropic from '@anthropic-ai/sdk'
import { env } from '@/lib/env'

/**
 * Anthropic client singleton. This is the ONLY module that imports the Anthropic
 * SDK (PROJECT_RULES.md §6) — all AI calls go through `@/lib/ai/*`.
 */
const globalForAnthropic = globalThis as unknown as { anthropic?: Anthropic }

export const anthropic = globalForAnthropic.anthropic ?? new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })

if (process.env.NODE_ENV !== 'production') globalForAnthropic.anthropic = anthropic
