import { count, and, gte, lte, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { goalCompletions, goals } from "../db/schema";
import dayjs from "dayjs";

interface CreateGoalCompletionRequest {
  goalId: string;
}

export async function createGoalCompletion({
  goalId,
}: CreateGoalCompletionRequest) {
  // pegar o primeiro dia da semana
  const firstDayOfWeek = dayjs().startOf("week").toDate();
  // pegar o ultimo dia da semana
  const lastDayOfWeek = dayjs().endOf("week").toDate();

  const goalCompletionsCounts = db.$with("goal_completions_counts").as(
    db
      // seleciona todos os registros
      .select({
        goalId: goalCompletions.goalId,
        // faz uma contagem de quantas vezes a meta foi concluida
        // sempre que fizer um count, sum dentro de uma commom-table-expression
        // e preciso passar o 'as' e atribuir um nome
        completionCount: count(goalCompletions.id).as("completionCount"),
      })
      .from(goalCompletions)
      // filtrar apenas os registros criados na semana em especifico
      .where(
        and(
          // data de criacao > ou = ao primeiro dia da semana
          gte(goalCompletions.createdAt, firstDayOfWeek),
          // data de criacao < ou = ao ultimo dia da semana
          lte(goalCompletions.createdAt, lastDayOfWeek),
          // nao vai icluir dados de uma meta
          // que nao e a meta que eu quero completar agora
          eq(goalCompletions.goalId, goalId)
        )
      )
      // agrupando as metas por id
      .groupBy(goalCompletions.goalId)
  );

  const result = await db
    .with(goalCompletionsCounts)
    // atualizar o numero de metas
    .select({
      desiredWeeklyFrequency: goals.desiredWeeklyFrequency,
      // dado que vem de outra tabela + transformando de null -> retornar 0
      completionCount: sql`      
      COALESCE(${goalCompletionsCounts.completionCount}, 0)
      `.mapWith(Number),
    })
    .from(goals)
    .leftJoin(goalCompletionsCounts, eq(goalCompletionsCounts.goalId, goals.id))
    // where para verificar que o goalsId seja igual ao goalId
    .where(eq(goals.id, goalId))
    .limit(1);

  const { completionCount, desiredWeeklyFrequency } = result[0];

  if (completionCount >= desiredWeeklyFrequency) {
    throw new Error("Goal already completed this week!");
  }

  const insertResult = await db
    .insert(goalCompletions)
    .values({
      goalId,
    })
    .returning();

  const goalCompletion = result[0];

  return { goalCompletion };
}
