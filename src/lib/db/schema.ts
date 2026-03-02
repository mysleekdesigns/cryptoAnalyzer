import {
  pgTable,
  text,
  timestamp,
  integer,
  numeric,
  boolean,
  jsonb,
  uuid,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import type { AdapterAccountType } from "next-auth/adapters";

// ─── Auth.js tables ───────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique().notNull(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  password: text("password"),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ]
);

export const sessions = pgTable("sessions", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (verificationToken) => [
    primaryKey({
      columns: [verificationToken.identifier, verificationToken.token],
    }),
  ]
);

export const authenticators = pgTable(
  "authenticators",
  {
    credentialID: text("credentialID").notNull().unique(),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    providerAccountId: text("providerAccountId").notNull(),
    credentialPublicKey: text("credentialPublicKey").notNull(),
    counter: integer("counter").notNull(),
    credentialDeviceType: text("credentialDeviceType").notNull(),
    credentialBackedUp: boolean("credentialBackedUp").notNull(),
    transports: text("transports"),
  },
  (authenticator) => [
    primaryKey({
      columns: [authenticator.userId, authenticator.credentialID],
    }),
  ]
);

// ─── Application tables ───────────────────────────────────────────────────────

export const watchlistItems = pgTable("watchlist_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  symbol: text("symbol").notNull(),
  assetType: text("asset_type").notNull(), // 'crypto' | 'stock'
  addedAt: timestamp("added_at", { mode: "date" }).notNull().defaultNow(),
});

export const portfolioHoldings = pgTable("portfolio_holdings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  symbol: text("symbol").notNull(),
  assetType: text("asset_type").notNull(), // 'crypto' | 'stock'
  quantity: numeric("quantity").notNull(),
  avgBuyPrice: numeric("avg_buy_price").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const portfolioTransactions = pgTable("portfolio_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  holdingId: uuid("holding_id")
    .notNull()
    .references(() => portfolioHoldings.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // 'buy' | 'sell'
  quantity: numeric("quantity").notNull(),
  price: numeric("price").notNull(),
  fee: numeric("fee").notNull().default("0"),
  executedAt: timestamp("executed_at", { mode: "date" }).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const signalHistory = pgTable("signal_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  symbol: text("symbol").notNull(),
  assetType: text("asset_type").notNull(), // 'crypto' | 'stock'
  signalType: text("signal_type").notNull(), // e.g. 'STRONG_BUY', 'BUY', 'HOLD', 'SELL', 'STRONG_SELL'
  compositeScore: integer("composite_score").notNull(),
  indicators: jsonb("indicators").notNull(),
  sentiment: jsonb("sentiment"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const priceAlerts = pgTable("price_alerts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  symbol: text("symbol").notNull(),
  assetType: text("asset_type").notNull(), // 'crypto' | 'stock'
  condition: text("condition").notNull(), // 'above' | 'below'
  targetPrice: numeric("target_price").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  triggeredAt: timestamp("triggered_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const userPreferences = pgTable("user_preferences", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  indicatorWeights: jsonb("indicator_weights"),
  defaultAssetType: text("default_asset_type").notNull().default("crypto"),
  theme: text("theme").notNull().default("dark"),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

// ─── Relations ────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many, one }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  watchlistItems: many(watchlistItems),
  portfolioHoldings: many(portfolioHoldings),
  signalHistory: many(signalHistory),
  priceAlerts: many(priceAlerts),
  preferences: one(userPreferences),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const authenticatorsRelations = relations(authenticators, ({ one }) => ({
  user: one(users, {
    fields: [authenticators.userId],
    references: [users.id],
  }),
}));

export const watchlistItemsRelations = relations(watchlistItems, ({ one }) => ({
  user: one(users, {
    fields: [watchlistItems.userId],
    references: [users.id],
  }),
}));

export const portfolioHoldingsRelations = relations(
  portfolioHoldings,
  ({ one, many }) => ({
    user: one(users, {
      fields: [portfolioHoldings.userId],
      references: [users.id],
    }),
    transactions: many(portfolioTransactions),
  })
);

export const portfolioTransactionsRelations = relations(
  portfolioTransactions,
  ({ one }) => ({
    holding: one(portfolioHoldings, {
      fields: [portfolioTransactions.holdingId],
      references: [portfolioHoldings.id],
    }),
  })
);

export const signalHistoryRelations = relations(signalHistory, ({ one }) => ({
  user: one(users, {
    fields: [signalHistory.userId],
    references: [users.id],
  }),
}));

export const priceAlertsRelations = relations(priceAlerts, ({ one }) => ({
  user: one(users, {
    fields: [priceAlerts.userId],
    references: [users.id],
  }),
}));

export const userPreferencesRelations = relations(
  userPreferences,
  ({ one }) => ({
    user: one(users, {
      fields: [userPreferences.userId],
      references: [users.id],
    }),
  })
);
