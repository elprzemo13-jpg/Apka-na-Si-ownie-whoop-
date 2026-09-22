import { supabase } from "../supabase";
import type { Remote, RemoteError } from "./types";

// A failed fetch (no response at all) means the network is gone; anything the
// server answered is a data problem that retrying alone will not fix.
function toError(error: { message: string; code?: string } | null): RemoteError | null {
  if (!error) return null;
  const retryable = !error.code || error.code === "" || /fetch|network/i.test(error.message);
  return { message: error.message, code: error.code, retryable };
}

export const supabaseRemote: Remote = {
  async upsert(table, payload) {
    const { error } = await supabase.from(table).upsert(payload);
    return { error: toError(error) };
  },
  async fetchSince(table, cursor, limit) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .gt("synced_at", cursor ?? "1970-01-01T00:00:00Z")
      .order("synced_at", { ascending: true })
      .limit(limit);
    return { rows: data ?? [], error: toError(error) };
  },
};
