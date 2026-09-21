// Runs the real migrations against PGlite (in-process Postgres) with a
// minimal stand-in for the parts of Supabase they depend on: the auth schema,
// auth.uid() and the anon/authenticated roles with Supabase's default grants.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";

const MIGRATIONS_DIR = join(import.meta.dirname, "..", "migrations");

const SUPABASE_STUB = `
  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  create role anon nologin;
  create role authenticated nologin;
  grant usage on schema public to anon, authenticated;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on functions to anon, authenticated;
  alter default privileges in schema public grant all on sequences to anon, authenticated;
`;

export type Db = PGlite & {
  /** Creates an auth user (which creates the profile) and returns its id. */
  createUser(): Promise<string>;
  /** Runs `fn` as the given user through RLS, then returns to superuser. */
  as<T>(userId: string, fn: () => Promise<T>): Promise<T>;
};

export async function createDb(): Promise<Db> {
  const pg = await PGlite.create();
  await pg.exec(SUPABASE_STUB);
  for (const file of readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort()) {
    await pg.exec(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
  }

  return Object.assign(pg, {
    async createUser() {
      const { rows } = await pg.query<{ id: string }>(
        "insert into auth.users (id) values (gen_random_uuid()) returning id",
      );
      return rows[0]!.id;
    },
    async as<T>(userId: string, fn: () => Promise<T>) {
      await pg.query("select set_config('request.jwt.claim.sub', $1, false)", [userId]);
      await pg.exec("set role authenticated");
      try {
        return await fn();
      } finally {
        await pg.exec("reset role");
        await pg.query("select set_config('request.jwt.claim.sub', '', false)");
      }
    },
  });
}
