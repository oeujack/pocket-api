import z from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
});

// parse verifica se o process.env segue a regra do envSchema
// se é uma string e se é também um URL se não for vai dar erro...
export const env = envSchema.parse(process.env);
