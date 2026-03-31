import { sql } from "./client";

export type SqlExecutor = typeof sql;

export function asSqlExecutor(tx: unknown): SqlExecutor {
  return tx as SqlExecutor;
}
