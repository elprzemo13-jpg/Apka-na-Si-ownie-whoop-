-- Social features (docs/PLAN.md E7).
--
-- Friends never read each other's rows directly: everything goes through these
-- functions, which decide per sharing level what may leave the database.
--   'full'  — sessions with numbers
--   'basic' — the fact that a session happened, and its discipline
--   'none'  — nothing at all
-- Privacy is the default; a new account shares nothing until it opts in.

-- ───────────── finding people ─────────────

/** Exact match on username or invite code — no listing, no partial search. */
create function public.find_user(q text)
returns table (id uuid, username text, display_name text)
language sql stable security definer set search_path = '' as $$
  select p.id, p.username, p.display_name
  from public.profiles p
  where auth.uid() is not null
    and p.id <> auth.uid()
    and (lower(p.username) = lower(trim(q)) or lower(p.invite_code) = lower(trim(q)))
  limit 1
$$;

/** Friends and pending invitations, with the names the app needs to show. */
create function public.my_relationships()
returns table (
  relationship_id uuid,
  other_id uuid,
  username text,
  display_name text,
  status public.relationship_status,
  incoming boolean,
  sharing public.sharing_level
)
language sql stable security definer set search_path = '' as $$
  select r.id,
         case when r.requester_id = auth.uid() then r.addressee_id else r.requester_id end,
         p.username,
         p.display_name,
         r.status,
         r.addressee_id = auth.uid(),
         case when r.status = 'accepted' then p.sharing_level else 'none'::public.sharing_level end
  from public.relationships r
  join public.profiles p
    on p.id = case when r.requester_id = auth.uid() then r.addressee_id else r.requester_id end
  where auth.uid() in (r.requester_id, r.addressee_id)
    and r.type = 'friend'
    and r.deleted_at is null
$$;

-- ───────────── shared views of training ─────────────

/** Accepted friends who share something, plus the caller. */
create function public.visible_people()
returns table (uid uuid, username text, display_name text, level public.sharing_level)
language sql stable security definer set search_path = '' as $$
  select p.id, p.username, p.display_name,
         case when p.id = auth.uid() then 'full'::public.sharing_level else p.sharing_level end
  from public.profiles p
  where p.id = auth.uid()
     or (
       p.sharing_level <> 'none'
       and exists (
         select 1 from public.relationships r
         where r.type = 'friend' and r.status = 'accepted' and r.deleted_at is null
           and ((r.requester_id = auth.uid() and r.addressee_id = p.id)
             or (r.addressee_id = auth.uid() and r.requester_id = p.id))
       )
     )
$$;

/** Recent sessions of friends. Numbers only at the 'full' level. */
create function public.friend_feed(days integer default 7)
returns table (
  user_id uuid,
  username text,
  display_name text,
  level public.sharing_level,
  performed_on date,
  discipline public.discipline,
  load_points numeric,
  day_label text
)
language sql stable security definer set search_path = '' as $$
  select v.uid, v.username, v.display_name, v.level,
         s.performed_on, s.discipline,
         case when v.level = 'full' then s.load_points end,
         case when v.level = 'full' then s.day_label_snapshot end
  from public.visible_people() v
  join public.sessions s on s.user_id = v.uid
  where s.deleted_at is null
    and s.performed_on > (current_date - greatest(days, 1))
  order by s.performed_on desc, s.created_at desc
  limit 200
$$;

/**
 * Weekly ranking. Completion is comparable between people, so everyone who
 * shares anything appears with it; load points are numbers, so they need 'full'.
 */
create function public.weekly_leaderboard(week_start date)
returns table (
  user_id uuid,
  username text,
  display_name text,
  level public.sharing_level,
  completion integer,
  gym numeric,
  swim numeric,
  run numeric,
  bike numeric
)
language sql stable security definer set search_path = '' as $$
  with people as (select * from public.visible_people()),
  week as (
    select s.user_id, s.discipline, s.load_points
    from public.sessions s
    join people p on p.uid = s.user_id
    where s.deleted_at is null
      and s.performed_on >= week_start
      and s.performed_on < week_start + 7
  ),
  counts as (
    select w.user_id, w.discipline, count(*)::int as done, sum(w.load_points) as points
    from week w group by 1, 2
  ),
  goals as (
    select g.user_id, g.discipline, g.target_sessions
    from public.weekly_goals g
    join people p on p.uid = g.user_id
    where g.deleted_at is null and g.target_sessions > 0
  ),
  completion as (
    select g.user_id,
           round(100.0 * sum(least(coalesce(c.done, 0), g.target_sessions)) / sum(g.target_sessions))::int as pct
    from goals g
    left join counts c on c.user_id = g.user_id and c.discipline = g.discipline
    group by g.user_id
  ),
  points as (
    select c.user_id,
           sum(c.points) filter (where c.discipline = 'gym') as gym,
           sum(c.points) filter (where c.discipline = 'swim') as swim,
           sum(c.points) filter (where c.discipline = 'run') as run,
           sum(c.points) filter (where c.discipline = 'bike') as bike
    from counts c group by c.user_id
  )
  select p.uid, p.username, p.display_name, p.level,
         coalesce(cm.pct, 0),
         case when p.level = 'full' then coalesce(pt.gym, 0) end,
         case when p.level = 'full' then coalesce(pt.swim, 0) end,
         case when p.level = 'full' then coalesce(pt.run, 0) end,
         case when p.level = 'full' then coalesce(pt.bike, 0) end
  from people p
  left join completion cm on cm.user_id = p.uid
  left join points pt on pt.user_id = p.uid
  order by coalesce(cm.pct, 0) desc
$$;

-- Only signed-in users; visible_people is an internal helper.
revoke execute on function public.find_user(text) from public, anon;
revoke execute on function public.my_relationships() from public, anon;
revoke execute on function public.friend_feed(integer) from public, anon;
revoke execute on function public.weekly_leaderboard(date) from public, anon;
revoke execute on function public.visible_people() from public, anon, authenticated;
