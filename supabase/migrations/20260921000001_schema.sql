-- Core schema. See docs/PLAN.md section 2.
--
-- Every synced table carries:
--   id          uuid generated on the device, so offline rows have a stable key
--   created_at  device time when the row was created
--   updated_at  device time of the last edit (last-write-wins, P14)
--   deleted_at  soft delete, so deletions made offline can be synced
--   synced_at   server time of the last accepted write; pull cursor for sync

-- ───────────── enums ─────────────

create type public.discipline as enum ('gym', 'swim', 'run', 'bike');
create type public.sharing_level as enum ('none', 'basic', 'full');
create type public.load_type as enum ('weighted', 'bodyweight', 'none');
create type public.progression as enum ('weight', 'fixed', 'height', 'time');
create type public.schedule_mode as enum ('weekly', 'rotation');
create type public.rep_unit as enum ('reps', 'seconds');
create type public.checklist_kind as enum ('warmup', 'stretch');
create type public.relationship_type as enum ('friend', 'coach');
create type public.relationship_status as enum ('pending', 'accepted', 'declined', 'blocked');

-- ───────────── users ─────────────

create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  username      text unique check (username ~ '^[a-z0-9_]{3,24}$'),
  display_name  text check (char_length(display_name) <= 40),
  invite_code   text not null unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 8),
  sharing_level public.sharing_level not null default 'none',
  timezone      text not null default 'Europe/Warsaw',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  synced_at     timestamptz not null default now()
);

create table public.weekly_goals (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles (id) on delete cascade,
  discipline      public.discipline not null,
  target_sessions smallint not null check (target_sessions between 0 and 21),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz,
  synced_at       timestamptz not null default now(),
  unique (user_id, discipline)
);

-- ───────────── exercises & plans ─────────────

create table public.exercises (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles (id) on delete cascade,
  name           text not null check (char_length(name) between 1 and 80),
  load_type      public.load_type not null default 'weighted',
  progression    public.progression not null default 'weight',
  weight_step_kg numeric(5, 2) not null default 2.5 check (weight_step_kg > 0),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz,
  synced_at      timestamptz not null default now()
);
create index on public.exercises (user_id);

create table public.plans (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references public.profiles (id) on delete cascade,
  -- separate from owner so a coach can author a plan for someone else (ROADMAP stage 2)
  author_id     uuid not null references public.profiles (id) on delete cascade,
  name          text not null check (char_length(name) between 1 and 60),
  schedule_mode public.schedule_mode not null default 'weekly',
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  synced_at     timestamptz not null default now()
);
create index on public.plans (owner_id);
create unique index plans_one_active_per_owner on public.plans (owner_id)
  where is_active and deleted_at is null;

create table public.plan_days (
  id             uuid primary key default gen_random_uuid(),
  plan_id        uuid not null references public.plans (id) on delete cascade,
  name           text not null check (char_length(name) between 1 and 40),
  position       integer not null default 0,
  -- 0 = Monday … 6 = Sunday; empty for rotation plans
  weekdays       smallint[] not null default '{}' check (weekdays <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]),
  default_rest_s integer not null default 90 check (default_rest_s between 0 and 900),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz,
  synced_at      timestamptz not null default now()
);
create index on public.plan_days (plan_id);

create table public.plan_exercises (
  id          uuid primary key default gen_random_uuid(),
  plan_day_id uuid not null references public.plan_days (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  position    integer not null default 0,
  annotation  text check (char_length(annotation) <= 60),
  target_sets smallint not null check (target_sets between 1 and 20),
  rep_min     smallint not null check (rep_min > 0),
  rep_max     smallint not null,
  rep_unit    public.rep_unit not null default 'reps',
  per_side    boolean not null default false,
  rest_s      integer check (rest_s between 0 and 900), -- null = plan day default
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  synced_at   timestamptz not null default now(),
  check (rep_max >= rep_min)
);
create index on public.plan_exercises (plan_day_id);

create table public.plan_checklist_items (
  id          uuid primary key default gen_random_uuid(),
  plan_id     uuid not null references public.plans (id) on delete cascade,
  plan_day_id uuid references public.plan_days (id) on delete cascade, -- null = every day of the plan
  kind        public.checklist_kind not null,
  label       text not null check (char_length(label) between 1 and 80),
  detail      text check (char_length(detail) <= 120),
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  synced_at   timestamptz not null default now()
);
create index on public.plan_checklist_items (plan_id);

-- ───────────── sessions ─────────────

create table public.sessions (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles (id) on delete cascade,
  discipline         public.discipline not null,
  performed_on       date not null, -- user's local calendar date
  plan_day_id        uuid references public.plan_days (id) on delete set null,
  day_label_snapshot text,
  distance_m         integer check (distance_m > 0),
  duration_s         integer check (duration_s > 0),
  session_type       text check (char_length(session_type) <= 30),
  swim_style         text check (char_length(swim_style) <= 30),
  underwater_m       integer check (underwater_m >= 0),
  notes              text check (char_length(notes) <= 2000),
  warmup_done        boolean not null default false,
  stretch_done       boolean not null default false,
  load_points        numeric(10, 3) not null default 0, -- maintained by triggers, never by clients
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  deleted_at         timestamptz,
  synced_at          timestamptz not null default now(),
  check (discipline = 'gym' or (distance_m is not null and duration_s is not null)),
  check (discipline = 'swim' or (swim_style is null and underwater_m is null))
);
create index on public.sessions (user_id, performed_on);

create table public.session_checklist_items (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  kind       public.checklist_kind not null,
  label      text not null,
  done       boolean not null default false,
  position   integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  synced_at  timestamptz not null default now()
);
create index on public.session_checklist_items (session_id);

create table public.session_exercises (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references public.sessions (id) on delete cascade,
  exercise_id   uuid not null references public.exercises (id) on delete cascade,
  position      integer not null default 0,
  name_snapshot text not null,
  skipped       boolean not null default false,
  -- snapshot of the plan target at training time
  target_sets   smallint,
  rep_min       smallint,
  rep_max       smallint,
  rep_unit      public.rep_unit not null default 'reps',
  per_side      boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  synced_at     timestamptz not null default now()
);
create index on public.session_exercises (session_id);
create index on public.session_exercises (exercise_id);

create table public.session_sets (
  id                  uuid primary key default gen_random_uuid(),
  session_exercise_id uuid not null references public.session_exercises (id) on delete cascade,
  set_no              smallint not null,
  reps                smallint not null check (reps >= 0), -- seconds when rep_unit = 'seconds'
  weight_kg           numeric(6, 2) check (weight_kg >= 0), -- added load for bodyweight exercises
  height_cm           numeric(5, 1) check (height_cm >= 0), -- progression = 'height' only
  is_extra            boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  deleted_at          timestamptz,
  synced_at           timestamptz not null default now()
);
create index on public.session_sets (session_exercise_id);

-- ───────────── relationships ─────────────

create table public.relationships (
  id           uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  type         public.relationship_type not null default 'friend',
  status       public.relationship_status not null default 'pending',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,
  synced_at    timestamptz not null default now(),
  check (requester_id <> addressee_id)
);
create unique index relationships_one_per_pair on public.relationships
  (least(requester_id, addressee_id), greatest(requester_id, addressee_id), type);

-- ───────────── sync guard ─────────────

-- Last-write-wins by device edit time (P14): an update carrying an older
-- updated_at than the stored row is silently dropped, and the client picks up
-- the newer row on its next pull. synced_at uses clock_timestamp() so the pull
-- cursor moves forward even inside long transactions.
create function public.sync_guard() returns trigger
language plpgsql as $$
begin
  if tg_op = 'UPDATE' then
    if new.updated_at < old.updated_at then
      return null;
    end if;
    new.created_at := old.created_at;
  end if;
  new.synced_at := clock_timestamp();
  return new;
end $$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'weekly_goals', 'exercises', 'plans', 'plan_days', 'plan_exercises',
    'plan_checklist_items', 'sessions', 'session_checklist_items', 'session_exercises',
    'session_sets', 'relationships'
  ] loop
    execute format(
      'create trigger sync_guard before insert or update on public.%I
         for each row execute function public.sync_guard()', t);
    execute format('create index on public.%I (synced_at)', t);
  end loop;
end $$;

-- ───────────── load points ─────────────

-- Multipliers per km (docs/PLAN.md P1). Gym uses volume instead.
create function public.load_multiplier(d public.discipline) returns numeric
language sql immutable as $$
  select case d
    when 'swim' then 1.2
    when 'run'  then 0.5
    when 'bike' then 0.12
  end
$$;

-- Gym: sum(reps × kg) / 1000 over live, non-skipped exercises.
create function public.gym_load(p_session_id uuid) returns numeric
language sql stable as $$
  select coalesce(sum(ss.reps * coalesce(ss.weight_kg, 0)), 0) / 1000
  from public.session_sets ss
  join public.session_exercises se on se.id = ss.session_exercise_id
  where se.session_id = p_session_id
    and not se.skipped
    and se.deleted_at is null
    and ss.deleted_at is null
$$;

create function public.sessions_set_load() returns trigger
language plpgsql as $$
begin
  if new.discipline = 'gym' then
    new.load_points := public.gym_load(new.id);
  else
    new.load_points := new.distance_m / 1000.0 * public.load_multiplier(new.discipline);
  end if;
  return new;
end $$;

-- Runs after sync_guard (triggers fire in name order).
create trigger zz_set_load before insert or update on public.sessions
  for each row execute function public.sessions_set_load();

-- Child changes touch the parent session; its trigger recomputes the load.
create function public.touch_session_from_exercise() returns trigger
language plpgsql as $$
begin
  update public.sessions set load_points = load_points
  where id = coalesce(new.session_id, old.session_id);
  return null;
end $$;

create trigger touch_session after insert or update or delete on public.session_exercises
  for each row execute function public.touch_session_from_exercise();

create function public.touch_session_from_set() returns trigger
language plpgsql as $$
begin
  update public.sessions s set load_points = s.load_points
  from public.session_exercises se
  where se.id = coalesce(new.session_exercise_id, old.session_exercise_id)
    and s.id = se.session_id;
  return null;
end $$;

create trigger touch_session after insert or update or delete on public.session_sets
  for each row execute function public.touch_session_from_set();

-- ───────────── personal records ─────────────

create view public.exercise_records with (security_invoker = true) as
with per_session as (
  select se.exercise_id,
         max(ss.weight_kg) as max_weight_kg,
         sum(ss.reps * coalesce(ss.weight_kg, 0)) as volume_kg
  from public.session_exercises se
  join public.sessions s on s.id = se.session_id
  join public.session_sets ss on ss.session_exercise_id = se.id
  where not se.skipped
    and se.deleted_at is null
    and s.deleted_at is null
    and ss.deleted_at is null
  group by se.exercise_id, se.id
)
select exercise_id,
       max(max_weight_kg) as max_weight_kg,
       max(volume_kg)     as best_volume_kg,
       count(*)           as session_count
from per_session
group by exercise_id;

-- ───────────── new user ─────────────

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
