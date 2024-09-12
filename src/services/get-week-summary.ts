import { and, count, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "../db";
import { goalCompletions, goals } from "../db/schema";
import dayjs from "dayjs";

export async function getWeekSummary() {
  const firstDayOfWeek = dayjs().startOf("week").toDate();
  const lastDayOfWeek = dayjs().endOf("week").toDate();

  // 1 - precisa retornar quais metas precisa ser finalizada nessa semana,
  // metas criadas antes ou durante a semana atual
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

  // 2- precisa retornar a informacao de quais metas foram finalizadas na semana
  // e que seja agrupado por dia
  const goalsCompletedInWeek = db.$with("goals_completed_in_week").as(
    db
      // seleciona todos os registros
      .select({
        id: goalCompletions.id,
        title: goals.title,
        // retornar a data por inteiro
        completedAt: goalCompletions.createdAt,
        // vai arrancar apenas a data e exclui horario e minutos
        completedAtDate: sql/*sql*/ `
          DATE(${goalCompletions.createdAt})
        `.as("completedAtDate"),
      })
      .from(goalCompletions)
      // eu quero que os dois lados da relacao existam
      .innerJoin(goals, eq(goals.id, goalCompletions.goalId))
      // filtrar apenas os registros criados na semana em especifico
      .where(
        and(
          // data de criacao > ou = ao primeiro dia da semana
          gte(goalCompletions.createdAt, firstDayOfWeek),
          // data de criacao < ou = ao ultimo dia da semana
          lte(goalCompletions.createdAt, lastDayOfWeek)
        )
      )
      .orderBy(desc(goalCompletions.createdAt))
  );

  // 3 - buscar as metas completadas, e agrupar as metas por data
  const goalsCompletedByWeekDay = db.$with("goals_completed_by_week_day").as(
    db
      .select({
        completedAtDate: goalsCompletedInWeek.completedAtDate,
        // agregacao em formato JSON
        // JSON_AGG -> converte retorno de linhas postgree em json, converte em array
        // JSON_BUILD_OBJECT -> vai criar objeto
        completions: sql/*sql*/ `
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id',${goalsCompletedInWeek.id},
              'title', ${goalsCompletedInWeek.title},
              'completedAt', ${goalsCompletedInWeek.completedAt}
            )
          )
        `.as("completions"),
      })
      .from(goalsCompletedInWeek)
      //agrupar os dados pelo campo
      .groupBy(goalsCompletedInWeek.completedAtDate)
  );

  type GoalsPerDay = Record<
    string,
    {
      id: string;
      title: string;
      completedAt: string;
    }[]
  >;

  const result = await db
    .with(goalsCreatedUpToWeek, goalsCompletedInWeek, goalsCompletedByWeekDay)
    .select({
      // total de metas completadas
      completed:
        sql/*sql*/ `(SELECT COUNT(*) FROM ${goalsCompletedInWeek})`.mapWith(
          Number
        ),
      // total de metas
      total:
        sql/*sql*/ `(SELECT SUM(${goalsCreatedUpToWeek.desiredWeeklyFrequency}) FROM ${goalsCreatedUpToWeek})`.mapWith(
          Number
        ),
      goalsPerDay: sql/*sql*/ <GoalsPerDay>`
        JSON_OBJECT_AGG(
          ${goalsCompletedByWeekDay.completedAtDate},
          ${goalsCompletedByWeekDay.completions}
        )
      `,
    })
    .from(goalsCompletedByWeekDay);

  return {
    summary: result,
  };
}
