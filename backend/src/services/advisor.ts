import { StateGraph, Annotation, START, END } from '@langchain/langgraph'
import { sql } from 'drizzle-orm'
import { db } from '../db/client.js'
import { budgets, categories, transactions, accounts } from '../db/schema.js'
import { getLlmSmart } from '../lib/llm.js'
import { analyzePrompt, advicePrompt } from '../prompts/index.js'
import { getMonthlyTotals, getCategoryBreakdown } from './insights.js'
import type { AdvisorAdvice } from '@outflow/shared'

// State definition for the LangGraph workflow
const AdvisorState = Annotation.Root({
  userId: Annotation<string>(),
  currentMonth: Annotation<string>(),
  historicalSummary: Annotation<string>(),
  categoryDetailJson: Annotation<string>(),
  budgetsJson: Annotation<string>(),
  daysRemaining: Annotation<number>(),
  spendingAnalysis: Annotation<string>(),
  advice: Annotation<AdvisorAdvice | null>(),
})

type State = typeof AdvisorState.State

function daysLeftInMonth(month: string): number {
  const [year, mon] = month.split('-').map(Number)
  const now = new Date()
  const lastDay = new Date(year, mon, 0).getDate()
  const today = now.getDate()
  return Math.max(0, lastDay - today)
}

async function getBudgetsJson(userId: string, month: string): Promise<string> {
  const [year, mon] = month.split('-').map(Number)
  const start = new Date(year, mon - 1, 1).toISOString().split('T')[0]
  const end = new Date(year, mon, 1).toISOString().split('T')[0]

  const rows = await db.execute<{
    target_amount_agorot: number
    name_he: string
    spent_agorot: number
  }>(sql`
    SELECT
      b.target_amount_agorot,
      c.name_he,
      COALESCE(
        SUM(t.charged_amount_agorot) FILTER (
          WHERE t.charged_amount_agorot < 0
            AND t.date >= ${start}::date
            AND t.date < ${end}::date
        ), 0
      ) * -1 AS spent_agorot
    FROM budgets b
    JOIN categories c ON c.id = b.category_id
    LEFT JOIN transactions t ON t.category_id = b.category_id
      AND t.account_id IN (SELECT id FROM accounts WHERE user_id = ${userId})
    WHERE b.user_id = ${userId}
      AND b.month = ${start}::date
    GROUP BY b.target_amount_agorot, c.name_he
    ORDER BY c.name_he
  `)

  return JSON.stringify(
    rows.rows.map((r) => ({
      category: r.name_he,
      budgetILS: Number(r.target_amount_agorot) / 100,
      spentILS: Number(r.spent_agorot) / 100,
    })),
  )
}

// Node 1: Gather all data from DB (no LLM call)
async function gatherData(state: State): Promise<Partial<State>> {
  const [historical, breakdown, budgetsJson] = await Promise.all([
    getMonthlyTotals(state.userId, 4),
    getCategoryBreakdown(state.userId, state.currentMonth),
    getBudgetsJson(state.userId, state.currentMonth),
  ])

  const currentMonthData = historical.find((h) => h.month === state.currentMonth) ?? {
    month: state.currentMonth,
    incomeAgorot: 0,
    expensesAgorot: 0,
  }
  const historicalOnly = historical.filter((h) => h.month !== state.currentMonth)

  const historicalSummary = JSON.stringify({
    history: historicalOnly.map((h) => ({
      month: h.month,
      incomeILS: h.incomeAgorot / 100,
      expensesILS: h.expensesAgorot / 100,
      savingsILS: (h.incomeAgorot - h.expensesAgorot) / 100,
    })),
    currentMonthSoFar: {
      month: currentMonthData.month,
      incomeILS: currentMonthData.incomeAgorot / 100,
      expensesILS: currentMonthData.expensesAgorot / 100,
    },
  })

  const categoryDetailJson = JSON.stringify(
    breakdown.map((c) => ({
      category: c.nameHe,
      spentILS: c.totalAgorot / 100,
      prevMonthILS: (c.prevMonthAgorot ?? 0) / 100,
      changePercent: c.changePercent,
    })),
  )

  return {
    historicalSummary,
    categoryDetailJson,
    budgetsJson,
    daysRemaining: daysLeftInMonth(state.currentMonth),
  }
}

// Node 2: LLM analyses spending patterns
async function analyzePatterns(state: State): Promise<Partial<State>> {
  const llm = getLlmSmart()
  const chain = analyzePrompt.pipe(llm)

  const historical = JSON.parse(state.historicalSummary) as {
    history: object[]
    currentMonthSoFar: object
  }

  const response = await chain.invoke({
    historicalData: JSON.stringify(historical.history, null, 2),
    currentMonthSummary: JSON.stringify(historical.currentMonthSoFar, null, 2),
  })

  const text = typeof response.content === 'string' ? response.content : String(response.content)
  const cleaned = text.replace(/```(?:json)?\n?/g, '').trim()

  return { spendingAnalysis: cleaned }
}

// Node 3: LLM generates actionable advice
async function generateAdvice(state: State): Promise<Partial<State>> {
  const llm = getLlmSmart()
  const chain = advicePrompt.pipe(llm)

  const response = await chain.invoke({
    analysis: state.spendingAnalysis,
    currentMonthDetail: state.categoryDetailJson,
    budgets: state.budgetsJson,
    daysRemaining: String(state.daysRemaining),
  })

  const text = typeof response.content === 'string' ? response.content : String(response.content)
  const cleaned = text.replace(/```(?:json)?\n?/g, '').trim()

  const ilsToAgorot = (ils: number) => Math.round((ils ?? 0) * 100)

  let raw: Record<string, unknown>
  try {
    raw = JSON.parse(cleaned)
  } catch {
    raw = {}
  }

  const forecast = (raw.monthForecast ?? {}) as Record<string, unknown>
  const advice: AdvisorAdvice = {
    summary: (raw.summary as string) || 'לא ניתן לנתח את הנתונים כרגע.',
    riskLevel: (raw.riskLevel as AdvisorAdvice['riskLevel']) || 'medium',
    monthForecast: {
      expectedExpensesAgorot: ilsToAgorot(forecast.expectedExpensesILS as number),
      note: (forecast.note as string) || '',
    },
    savingOpportunities: ((raw.savingOpportunities as unknown[]) ?? []).map((op) => {
      const o = op as Record<string, unknown>
      return {
        categoryNameHe: o.categoryNameHe as string,
        suggestion: o.suggestion as string,
        estimatedSavingAgorot: ilsToAgorot(o.estimatedSavingILS as number),
      }
    }),
    spendingPermissions: ((raw.spendingPermissions as unknown[]) ?? []).map((sp) => {
      const s = sp as Record<string, unknown>
      return {
        categoryNameHe: s.categoryNameHe as string,
        suggestion: s.suggestion as string,
        estimatedBudgetAgorot: ilsToAgorot(s.estimatedBudgetILS as number),
      }
    }),
    generalAdvice: (raw.generalAdvice as string[]) ?? ['נסה שוב מאוחר יותר'],
    generatedAt: new Date().toISOString(),
  }

  return { advice }
}

// Build and compile the LangGraph workflow once
const workflow = new StateGraph(AdvisorState)
  .addNode('gatherData', gatherData)
  .addNode('analyzePatterns', analyzePatterns)
  .addNode('generateAdvice', generateAdvice)
  .addEdge(START, 'gatherData')
  .addEdge('gatherData', 'analyzePatterns')
  .addEdge('analyzePatterns', 'generateAdvice')
  .addEdge('generateAdvice', END)

const graph = workflow.compile()

export async function runAdvisor(userId: string, currentMonth: string): Promise<AdvisorAdvice> {
  const result = await graph.invoke({
    userId,
    currentMonth,
    historicalSummary: '',
    categoryDetailJson: '',
    budgetsJson: '',
    daysRemaining: 0,
    spendingAnalysis: '',
    advice: null,
  })

  if (!result.advice) {
    throw new Error('Advisor graph completed without producing advice')
  }

  return result.advice
}
