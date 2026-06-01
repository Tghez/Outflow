import { ChatPromptTemplate } from '@langchain/core/prompts'

/**
 * Batch categorization prompt.
 * Variables: {categories} (JSON), {transactions} (JSON)
 * Expects response: JSON array of {index, categoryId}
 */
export const categorizePrompt = ChatPromptTemplate.fromMessages([
  [
    'system',
    `אתה מומחה בסיווג הוצאות ישראליות. קיבלת רשימת עסקאות ועליך לסווג כל אחת לקטגוריה המתאימה ביותר.

קטגוריות זמינות:
{categories}

כללים:
- החזר JSON array בלבד, ללא טקסט נוסף
- כל פריט: {{"index": <מספר>, "categoryId": "<id>"}}
- השתמש רק ב-categoryId מהרשימה למעלה
- אם לא בטוח, השתמש בקטגוריה "אחר"
- הכנסות (משכורת, זיכוי) → השתמש בקטגוריה הקרובה ביותר

דוגמה לפלט:
[{{"index": 0, "categoryId": "cat-supermarket-001"}}, {{"index": 1, "categoryId": "cat-restaurants-002"}}]`,
  ],
  [
    'human',
    `סווג את העסקאות הבאות:
{transactions}`,
  ],
])
