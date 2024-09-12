import { z } from "zod";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { createGoal } from "../../services/create-goal";

export const createGoalRoute: FastifyPluginAsyncZod = async (app) => {
  app.post(
    "/goals",
    {
      schema: {
        body: z.object({
          title: z.string(),
          // min 1 e max 7 de repeticoes que essa meta pode ter por semana
          desiredWeeklyFrequency: z.number().int().min(1).max(7),
        }),
      },
    },
    async (request) => {
      const { title, desiredWeeklyFrequency } = request.body;

      await createGoal({
        title,
        desiredWeeklyFrequency,
      });
    }
  );
};
