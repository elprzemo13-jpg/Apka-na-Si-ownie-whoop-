import { supabase } from "./supabase";
import type { Discipline } from "./data/types";

// Everything here goes straight to the server: friends' data is never stored
// locally, so the social screen needs a connection.

export type SharingLevel = "none" | "basic" | "full";

export type Relationship = {
  relationship_id: string;
  other_id: string;
  username: string | null;
  display_name: string | null;
  status: "pending" | "accepted" | "declined" | "blocked";
  /** true when the other person invited us */
  incoming: boolean;
  sharing: SharingLevel;
};

export type FeedEntry = {
  user_id: string;
  username: string | null;
  display_name: string | null;
  level: SharingLevel;
  performed_on: string;
  discipline: Discipline;
  load_points: number | null;
  day_label: string | null;
};

export type LeaderboardRow = {
  user_id: string;
  username: string | null;
  display_name: string | null;
  level: SharingLevel;
  completion: number;
  gym: number | null;
  swim: number | null;
  run: number | null;
  bike: number | null;
};

export async function findUser(query: string) {
  const { data, error } = await supabase.rpc("find_user", { q: query });
  if (error) throw error;
  return (data as { id: string; username: string | null; display_name: string | null }[])[0] ?? null;
}

export async function myRelationships(): Promise<Relationship[]> {
  const { data, error } = await supabase.rpc("my_relationships");
  if (error) throw error;
  return (data ?? []) as Relationship[];
}

export async function sendInvite(otherId: string, meId: string) {
  const { error } = await supabase.from("relationships").insert({
    requester_id: meId,
    addressee_id: otherId,
    type: "friend",
    status: "pending",
  });
  if (error) throw error;
}

/** Only the addressee may answer — the database enforces it as well. */
export async function respondToInvite(relationshipId: string, accept: boolean) {
  const { error } = await supabase
    .from("relationships")
    .update({ status: accept ? "accepted" : "declined", updated_at: new Date().toISOString() })
    .eq("id", relationshipId);
  if (error) throw error;
}

export async function removeFriend(relationshipId: string) {
  const { error } = await supabase.from("relationships").delete().eq("id", relationshipId);
  if (error) throw error;
}

export async function friendFeed(days = 7): Promise<FeedEntry[]> {
  const { data, error } = await supabase.rpc("friend_feed", { days });
  if (error) throw error;
  return (data ?? []) as FeedEntry[];
}

export async function weeklyLeaderboard(weekStartDate: string): Promise<LeaderboardRow[]> {
  const { data, error } = await supabase.rpc("weekly_leaderboard", { week_start: weekStartDate });
  if (error) throw error;
  return (data ?? []) as LeaderboardRow[];
}

export async function setSharingLevel(userId: string, level: SharingLevel) {
  const { error } = await supabase
    .from("profiles")
    .update({ sharing_level: level, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) throw error;
}
