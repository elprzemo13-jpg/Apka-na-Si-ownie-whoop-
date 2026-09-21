-- Row Level Security. See docs/PLAN.md section 2.
--
-- One function decides what one user may see of another: access_level().
-- Coach mode (ROADMAP stage 2) extends that function; the policies stay.

-- ───────────── access helpers ─────────────

create function public.access_level(viewer uuid, target uuid) returns public.sharing_level
language sql stable security definer set search_path = '' as $$
  select case
    when viewer is null then 'none'::public.sharing_level
    when viewer = target then 'full'::public.sharing_level
    when exists (
      select 1 from public.relationships r
      where r.type = 'friend'
        and r.status = 'accepted'
        and r.deleted_at is null
        and ((r.requester_id = viewer and r.addressee_id = target)
          or (r.requester_id = target and r.addressee_id = viewer))
    ) then (select p.sharing_level from public.profiles p where p.id = target)
    else 'none'::public.sharing_level
  end
$$;

create function public.can_read_plan(p_plan_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.plans p
    where p.id = p_plan_id and (p.owner_id = auth.uid() or p.author_id = auth.uid())
  )
$$;

create function public.owns_plan(p_plan_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.plans p where p.id = p_plan_id and p.owner_id = auth.uid())
$$;

create function public.plan_of_day(p_plan_day_id uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select plan_id from public.plan_days where id = p_plan_day_id
$$;

create function public.owns_exercise(p_exercise_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.exercises e where e.id = p_exercise_id and e.user_id = auth.uid())
$$;

create function public.session_owner(p_session_id uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select user_id from public.sessions where id = p_session_id
$$;

create function public.session_of_exercise(p_session_exercise_id uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select session_id from public.session_exercises where id = p_session_exercise_id
$$;

-- ───────────── enable RLS ─────────────

alter table public.profiles                enable row level security;
alter table public.weekly_goals            enable row level security;
alter table public.exercises               enable row level security;
alter table public.plans                   enable row level security;
alter table public.plan_days               enable row level security;
alter table public.plan_exercises          enable row level security;
alter table public.plan_checklist_items    enable row level security;
alter table public.sessions                enable row level security;
alter table public.session_checklist_items enable row level security;
alter table public.session_exercises       enable row level security;
alter table public.session_sets            enable row level security;
alter table public.relationships           enable row level security;

-- ───────────── profiles ─────────────
-- Own row only. Finding others by username / invite code goes through RPCs (E7)
-- so the table can't be enumerated. Rows are created by handle_new_user().

create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid());
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- ───────────── own-data tables ─────────────

create policy weekly_goals_all on public.weekly_goals for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy exercises_all on public.exercises for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ───────────── plans ─────────────

create policy plans_select on public.plans for select to authenticated
  using (owner_id = auth.uid() or author_id = auth.uid());
create policy plans_insert on public.plans for insert to authenticated
  with check (owner_id = auth.uid() and author_id = auth.uid());
create policy plans_update on public.plans for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy plans_delete on public.plans for delete to authenticated
  using (owner_id = auth.uid());

create policy plan_days_select on public.plan_days for select to authenticated
  using (public.can_read_plan(plan_id));
create policy plan_days_write on public.plan_days for all to authenticated
  using (public.owns_plan(plan_id)) with check (public.owns_plan(plan_id));

create policy plan_exercises_select on public.plan_exercises for select to authenticated
  using (public.can_read_plan(public.plan_of_day(plan_day_id)));
create policy plan_exercises_write on public.plan_exercises for all to authenticated
  using (public.owns_plan(public.plan_of_day(plan_day_id)))
  with check (public.owns_plan(public.plan_of_day(plan_day_id)) and public.owns_exercise(exercise_id));

create policy plan_checklist_select on public.plan_checklist_items for select to authenticated
  using (public.can_read_plan(plan_id));
create policy plan_checklist_write on public.plan_checklist_items for all to authenticated
  using (public.owns_plan(plan_id))
  with check (
    public.owns_plan(plan_id)
    and (plan_day_id is null or public.plan_of_day(plan_day_id) = plan_id)
  );

-- ───────────── sessions ─────────────
-- Friends at 'full' may read rows. 'basic' never gets rows: it is served by
-- friend_feed() / weekly_leaderboard() RPCs with limited columns (E7).

create policy sessions_select on public.sessions for select to authenticated
  using (user_id = auth.uid() or public.access_level(auth.uid(), user_id) = 'full');
create policy sessions_insert on public.sessions for insert to authenticated
  with check (user_id = auth.uid());
create policy sessions_update on public.sessions for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy sessions_delete on public.sessions for delete to authenticated
  using (user_id = auth.uid());

create policy session_checklist_select on public.session_checklist_items for select to authenticated
  using (public.access_level(auth.uid(), public.session_owner(session_id)) = 'full');
create policy session_checklist_write on public.session_checklist_items for all to authenticated
  using (public.session_owner(session_id) = auth.uid())
  with check (public.session_owner(session_id) = auth.uid());

create policy session_exercises_select on public.session_exercises for select to authenticated
  using (public.access_level(auth.uid(), public.session_owner(session_id)) = 'full');
create policy session_exercises_write on public.session_exercises for all to authenticated
  using (public.session_owner(session_id) = auth.uid())
  with check (public.session_owner(session_id) = auth.uid() and public.owns_exercise(exercise_id));

create policy session_sets_select on public.session_sets for select to authenticated
  using (public.access_level(auth.uid(), public.session_owner(public.session_of_exercise(session_exercise_id))) = 'full');
create policy session_sets_write on public.session_sets for all to authenticated
  using (public.session_owner(public.session_of_exercise(session_exercise_id)) = auth.uid())
  with check (public.session_owner(public.session_of_exercise(session_exercise_id)) = auth.uid());

-- ───────────── relationships ─────────────

create policy relationships_select on public.relationships for select to authenticated
  using (auth.uid() in (requester_id, addressee_id));
create policy relationships_insert on public.relationships for insert to authenticated
  with check (requester_id = auth.uid() and status = 'pending' and type = 'friend');
create policy relationships_update on public.relationships for update to authenticated
  using (auth.uid() in (requester_id, addressee_id))
  with check (auth.uid() in (requester_id, addressee_id));
create policy relationships_delete on public.relationships for delete to authenticated
  using (auth.uid() in (requester_id, addressee_id));

-- Only the addressee answers an invitation; the pair and type never change.
create function public.relationships_guard() returns trigger
language plpgsql as $$
begin
  if new.requester_id <> old.requester_id
     or new.addressee_id <> old.addressee_id
     or new.type <> old.type then
    raise exception 'relationship parties and type are immutable';
  end if;
  if new.status <> old.status and auth.uid() <> old.addressee_id then
    raise exception 'only the addressee can change the status';
  end if;
  return new;
end $$;

create trigger relationships_guard before update on public.relationships
  for each row execute function public.relationships_guard();

-- Note: sessions.load_points needs no column privilege tweak — the zz_set_load
-- trigger overwrites whatever a client sends on every insert and update.
