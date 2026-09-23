import { useCallback, useEffect, useState } from "react";
import { Button } from "../../components/ui/Button";
import { Chip } from "../../components/ui/Chip";
import { Notice } from "../../components/ui/Notice";
import { TextField } from "../../components/ui/TextField";
import { useAuth } from "../../lib/auth/AuthProvider";
import { weekStart } from "../../lib/dates";
import {
  findUser,
  friendFeed,
  myRelationships,
  removeFriend,
  respondToInvite,
  sendInvite,
  setSharingLevel,
  weeklyLeaderboard,
  type FeedEntry,
  type LeaderboardRow,
  type Relationship,
  type SharingLevel,
} from "../../lib/social";
import { t } from "../../lib/i18n/pl";

const LEVELS: SharingLevel[] = ["none", "basic", "full"];

const nameOf = (person: { username: string | null; display_name: string | null }) =>
  person.display_name || (person.username ? `@${person.username}` : "—");

export function FriendsPage() {
  const { session, profile, refreshProfile } = useAuth();
  const userId = session?.user.id;

  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [feed, setFeed] = useState<FeedEntry[]>([]);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState<{ tone: "error" | "ok"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [offline, setOffline] = useState(!navigator.onLine);

  const reload = useCallback(async () => {
    if (!navigator.onLine) {
      setOffline(true);
      return;
    }
    setOffline(false);
    try {
      const [rel, board, entries] = await Promise.all([
        myRelationships(),
        weeklyLeaderboard(weekStart()),
        friendFeed(7),
      ]);
      setRelationships(rel);
      setLeaderboard(board);
      setFeed(entries);
    } catch {
      setMessage({ tone: "error", text: t.errors.generic });
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const friends = relationships.filter((r) => r.status === "accepted");
  const incoming = relationships.filter((r) => r.status === "pending" && r.incoming);
  const outgoing = relationships.filter((r) => r.status === "pending" && !r.incoming);

  async function invite() {
    if (!userId) return;
    setBusy(true);
    setMessage(null);
    try {
      const found = await findUser(query.trim());
      if (!found) {
        setMessage({ tone: "error", text: t.friends.notFound });
      } else if (relationships.some((r) => r.other_id === found.id)) {
        setMessage({ tone: "error", text: t.friends.alreadyLinked });
      } else {
        await sendInvite(found.id, userId);
        setQuery("");
        setMessage({ tone: "ok", text: t.friends.inviteSent });
        await reload();
      }
    } catch {
      setMessage({ tone: "error", text: t.errors.generic });
    } finally {
      setBusy(false);
    }
  }

  if (offline) {
    return (
      <div className="px-4 pt-5">
        <Notice tone="info">{t.friends.offline}</Notice>
        <Button variant="ghost" onClick={() => void reload()}>
          {t.common.retry}
        </Button>
      </div>
    );
  }

  return (
    <div className="px-4 pt-5 pb-4">
      <section className="mb-6">
        <div className="section-label mb-1">{t.friends.privacy}</div>
        <p className="mb-2.5 text-[11px] text-dim">{t.friends.privacyHint}</p>
        <div className="mb-2 flex flex-wrap gap-2">
          {LEVELS.map((level) => (
            <Chip
              key={level}
              label={t.friends.levels[level]}
              active={profile?.sharing_level === level}
              onClick={async () => {
                if (!userId) return;
                await setSharingLevel(userId, level);
                await refreshProfile();
                await reload();
              }}
            />
          ))}
        </div>
        <p className="text-[11px] text-dim">{t.friends.levelHints[profile?.sharing_level ?? "none"]}</p>
      </section>

      <section className="mb-6">
        <div className="section-label mb-1">{t.friends.add}</div>
        <p className="mb-2.5 text-[11px] text-dim">{t.friends.addHint}</p>
        <TextField
          label={t.friends.search}
          placeholder={t.friends.addPlaceholder}
          autoCapitalize="none"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {message && <Notice tone={message.tone}>{message.text}</Notice>}
        <Button busy={busy} disabled={!query.trim()} onClick={() => void invite()}>
          {t.friends.invite}
        </Button>
        <p className="mt-2 text-[11px] text-dim">
          {t.friends.yourCode}: <span className="text-tx">{profile?.invite_code}</span>
        </p>
      </section>

      {(incoming.length > 0 || outgoing.length > 0) && (
        <section className="mb-6">
          <div className="section-label mb-2.5">{t.friends.invitations}</div>
          {incoming.map((invitation) => (
            <div key={invitation.relationship_id} className="mb-2 rounded-[14px] bg-panel p-3.5">
              <div className="mb-2 text-[14px] font-semibold">{nameOf(invitation)}</div>
              <div className="flex gap-2">
                <Button
                  onClick={async () => {
                    await respondToInvite(invitation.relationship_id, true);
                    await reload();
                  }}
                >
                  {t.friends.accept}
                </Button>
                <Button
                  variant="ghost"
                  onClick={async () => {
                    await respondToInvite(invitation.relationship_id, false);
                    await reload();
                  }}
                >
                  {t.friends.decline}
                </Button>
              </div>
            </div>
          ))}
          {outgoing.map((invitation) => (
            <div
              key={invitation.relationship_id}
              className="mb-2 flex items-center justify-between rounded-[14px] bg-panel p-3.5"
            >
              <span className="text-[14px]">{nameOf(invitation)}</span>
              <span className="text-[11px] text-dim">{t.friends.waiting}</span>
            </div>
          ))}
        </section>
      )}

      <section className="mb-6">
        <div className="section-label mb-1">{t.friends.ranking}</div>
        <p className="mb-2.5 text-[11px] text-dim">{t.friends.rankingHint}</p>
        <div className="rounded-[14px] bg-panel px-1 py-1">
          {leaderboard.map((row) => {
            const points = [row.gym, row.swim, row.run, row.bike];
            const total = points.every((value) => value === null)
              ? null
              : points.reduce<number>((sum, value) => sum + Number(value ?? 0), 0);
            return (
              <div
                key={row.user_id}
                className="flex items-center justify-between border-b border-line p-3 last:border-b-0"
              >
                <span className="text-[14px]">
                  {row.user_id === session?.user.id ? t.friends.you : nameOf(row)}
                </span>
                <span className="flex items-baseline gap-2">
                  <span className="font-head text-xl font-bold">{row.completion}%</span>
                  <span className="text-[11px] text-dim">
                    {total === null ? t.friends.hiddenNumbers : `${total.toFixed(1)} pkt`}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mb-6">
        <div className="section-label mb-2.5">{t.friends.feed}</div>
        {feed.length === 0 && <p className="text-[13px] text-dim">{t.friends.feedEmpty}</p>}
        {feed.map((entry, index) => (
          <div key={index} className="mb-2 flex items-center gap-3 rounded-[14px] bg-panel p-3.5">
            <div
              className={`h-9 w-[3px] flex-none rounded-[2px] ${entry.discipline === "gym" ? "bg-green" : "bg-blue"}`}
            />
            <div className="flex-1">
              <div className="text-[14px] font-semibold">{nameOf(entry)}</div>
              <div className="mt-0.5 text-[12px] text-dim">
                {t.disciplines[entry.discipline]}
                {entry.day_label && ` · ${entry.day_label}`}
                {entry.load_points !== null && ` · ${Number(entry.load_points).toFixed(1)} pkt`}
              </div>
            </div>
            <span className="text-[11px] text-dim">{entry.performed_on.slice(5)}</span>
          </div>
        ))}
      </section>

      {friends.length > 0 && (
        <section>
          <div className="section-label mb-2.5">{t.friends.list}</div>
          <div className="rounded-[14px] bg-panel px-1 py-1">
            {friends.map((friend) => (
              <div
                key={friend.relationship_id}
                className="flex items-center justify-between border-b border-line p-3 last:border-b-0"
              >
                <span className="text-[14px]">{nameOf(friend)}</span>
                <button
                  type="button"
                  onClick={async () => {
                    if (!confirm(t.friends.removeConfirm)) return;
                    await removeFriend(friend.relationship_id);
                    await reload();
                  }}
                  aria-label={t.friends.remove}
                  className="flex h-tap w-8 items-center justify-center text-dim"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
