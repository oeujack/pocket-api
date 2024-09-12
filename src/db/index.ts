import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { env } from "../env";

// arquivo para criar conexao c/ bd

export const client = postgres(env.DATABASE_URL);
// logger serve para visualizar todas as queries no bd
export const db = drizzle(client, { schema, logger: true });
