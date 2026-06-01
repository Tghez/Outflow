import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  date,
  jsonb,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ─── users ───────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  displayName: varchar('display_name', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ─── accounts ────────────────────────────────────────────────────────────────

export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  companyId: varchar('company_id', { length: 50 }).notNull(),
  accountName: varchar('account_name', { length: 255 }).notNull(),
  // Stored as { iv: string, tag: string, ciphertext: string } (all hex)
  encryptedCredentials: jsonb('encrypted_credentials').notNull(),
  lastSyncAt: timestamp('last_sync_at'),
  syncStatus: varchar('sync_status', { length: 20 }).default('idle'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ─── categories ──────────────────────────────────────────────────────────────

export const categories = pgTable('categories', {
  id: varchar('id', { length: 50 }).primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  nameHe: varchar('name_he', { length: 100 }).notNull(),
  icon: varchar('icon', { length: 10 }).notNull().default('💳'),
  color: varchar('color', { length: 7 }).notNull().default('#9ca3af'),
  isSystem: boolean('is_system').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ─── transactions ─────────────────────────────────────────────────────────────

export const transactions = pgTable(
  'transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    date: date('date').notNull(),
    processedDate: date('processed_date'),
    description: varchar('description', { length: 500 }).notNull(),
    rawDescription: varchar('raw_description', { length: 500 }).notNull(),
    chargedAmountAgorot: integer('charged_amount_agorot').notNull(),
    originalAmountAgorot: integer('original_amount_agorot'),
    originalCurrency: varchar('original_currency', { length: 3 }),
    categoryId: varchar('category_id', { length: 50 }).references(
      () => categories.id,
    ),
    categoryOverriddenByUser: boolean('category_overridden_by_user')
      .default(false)
      .notNull(),
    identifier: varchar('identifier', { length: 255 }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('completed'),
    type: varchar('type', { length: 20 }).notNull().default('normal'),
    installmentNumber: integer('installment_number'),
    installmentTotal: integer('installment_total'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [uniqueIndex('transactions_account_identifier_idx').on(t.accountId, t.identifier)],
)

// ─── budgets ──────────────────────────────────────────────────────────────────

export const budgets = pgTable(
  'budgets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    categoryId: varchar('category_id', { length: 50 })
      .notNull()
      .references(() => categories.id),
    month: date('month').notNull(),
    targetAmountAgorot: integer('target_amount_agorot').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [uniqueIndex('budgets_user_category_month_idx').on(t.userId, t.categoryId, t.month)],
)

// ─── category_rules ──────────────────────────────────────────────────────────

export const categoryRules = pgTable('category_rules', {
  id: varchar('id', { length: 50 }).primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  categoryId: varchar('category_id', { length: 50 })
    .notNull()
    .references(() => categories.id, { onDelete: 'cascade' }),
  pattern: text('pattern').notNull(),
  patternType: varchar('pattern_type', { length: 20 }).notNull(),
  priority: integer('priority').notNull().default(0),
  isSystem: boolean('is_system').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ─── relations ───────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  categories: many(categories),
  budgets: many(budgets),
  categoryRules: many(categoryRules),
}))

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
  transactions: many(transactions),
}))

export const transactionsRelations = relations(transactions, ({ one }) => ({
  account: one(accounts, {
    fields: [transactions.accountId],
    references: [accounts.id],
  }),
  category: one(categories, {
    fields: [transactions.categoryId],
    references: [categories.id],
  }),
}))

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  user: one(users, { fields: [categories.userId], references: [users.id] }),
  transactions: many(transactions),
  budgets: many(budgets),
  rules: many(categoryRules),
}))

export const budgetsRelations = relations(budgets, ({ one }) => ({
  user: one(users, { fields: [budgets.userId], references: [users.id] }),
  category: one(categories, {
    fields: [budgets.categoryId],
    references: [categories.id],
  }),
}))

export const categoryRulesRelations = relations(categoryRules, ({ one }) => ({
  user: one(users, { fields: [categoryRules.userId], references: [users.id] }),
  category: one(categories, {
    fields: [categoryRules.categoryId],
    references: [categories.id],
  }),
}))
