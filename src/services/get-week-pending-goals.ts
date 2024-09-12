import dayjs from "dayjs";
import weekOfYear from "dayjs/plugin/weekOfYear";
import { db } from "../db";
import { goalCompletions, goals } from "../db/schema";
import { count, lte, and, gte, eq, sql } from "drizzle-orm";

dayjs.extend(weekOfYear);

export async function getWeekPendingGoals() {
  // pegar o primeiro dia da semana
  const firstDayOfWeek = dayjs().startOf("week").toDate();
  // pegar o ultimo dia da semana
  const lastDayOfWeek = dayjs().endOf("week").toDate();

  // goalsCreatedUpToWeek ->> (commom-table-expression)
  // selecionar todas as metas criadas ate essa semana(1-7)
  // onde a data de criacao seja menor ou igual ao ultimo dia da semana
  const goalsCreatedUpToWeek = db.$with("goals_created_up_to_week").as(
    db
      // select -> para filtrar QUAIS campos eu quero que retorne
      .select({
        id: goals.id,
        title: goals.title,
        desiredWeeklyFrequency: goals.desiredWeeklyFrequency,
        createdAt: goals.createdAt,
      })
      // seleciona todas as metas da tabela 'goals'
      .from(goals)
      // lessThanEqual(lte) -> que seja menor ou igual ao ultimo dia da semana
      // data de criacao seguido do ultimo dia da semana
      .where(lte(goals.createdAt, lastDayOfWeek))
  );

  // goalCompletionsCounts ->> (commom-table-expression)
  // vai retornar a contagem de metas concluidas dentro da semana
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
          lte(goalCompletions.createdAt, lastDayOfWeek)
        )
      )
      // agrupando as metas por id
      .groupBy(goalCompletions.goalId)
  );

  // query principal ->>
  // veja que o with() nao possui '$' porque nao esta sendo criado
  // commom-table-expression e sim uma query que vai USAR
  // 'goalsCreatedUpToWeek' + 'goalCompletionsCounts'

  const pendingGoals = await db
    .with(goalsCreatedUpToWeek, goalCompletionsCounts)
    .select({
      id: goalsCreatedUpToWeek.id,
      title: goalsCreatedUpToWeek.title,
      desiredWeeklyFrequency: goalsCreatedUpToWeek.desiredWeeklyFrequency,
      // dado que vem de outra tabela + transformando de null -> retornar 0
      completionCount: sql`      
      COALESCE(${goalCompletionsCounts.completionCount}, 0)
      `.mapWith(Number),
    })
    // menciona de onde vai ser selecionado os dados
    .from(goalsCreatedUpToWeek)
    // cruzar os dados com 'goalCompletionsCounts'
    // leftJoin -> os registros podem nao existir
    // mas caso nao exista pra determinada meta eu quero que continue retornando
    .leftJoin(
      goalCompletionsCounts,
      // goalCompletionsCounts.goalId tem que ser igual ao id da goalsCreatedUpToWeek
      eq(goalCompletionsCounts.goalId, goalsCreatedUpToWeek.id)
    )
    .toSQL();

  return { pendingGoals };
}
