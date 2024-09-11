import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
// pgTable para criar uma tabela no banco
// goals é o nome da tabela
export const goals = pgTable("goals", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  title: text("title").notNull(),
  desiredWeeklyFrequency: integer("desired_weekly_frequency").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    // defaultNow = quando alguem cadastrar uma nova meta o campo createdAt
    // seja preenchido automaticamente com a data atual
    .defaultNow(),
});

// Sempre que você aplica alterações ao esquema,
// basta executar novamente e ele gerará a migração SQL para você
// de forma totalmente automática na maioria dos casos.

// npx drizzle-kit generate

export const goalCompletions = pgTable("goal_completions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  goalId: text("goal_id")
    .references(() => goals.id)
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
