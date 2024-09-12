import fastify from "fastify";
import { createGoal } from "../services/create-goal";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import z from "zod";
import { getWeekPendingGoals } from "../services/get-week-pending-goals";
import { createGoalCompletion } from "../services/create-goals-completions";

const app = fastify().withTypeProvider<ZodTypeProvider>();

// quase toda rota vai ser necessario
// padronizar, entao utiliza-se o fastify-type-provider-zod (acessar DOC)
app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

app.post(
  "/completions",
  {
    schema: {
      body: z.object({
        goalId: z.string(),
      }),
    },
  },
  async (request) => {
    const { goalId } = request.body;

    await createGoalCompletion({
      goalId,
    });
  }
);

app.get("/pending-goals", async () => {
  const { pendingGoals } = await getWeekPendingGoals();
  return { pendingGoals };
});

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

app
  .listen({
    port: 3333,
  })
  .then(() => {
    console.log("HTTP server running!");
  });
