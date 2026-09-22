-- access_level(viewer, target) let any signed-in user probe arbitrary pairs
-- ("are X and Y friends, and what does Y share?"). The viewer is now always
-- the caller, and internal helpers are no longer callable by anonymous users.

create function public.access_level(target uuid) returns public.sharing_level
language sql stable security definer set search_path = '' as $$
  select case
    when auth.uid() is null then 'none'::public.sharing_level
    when auth.uid() = target then 'full'::public.sharing_level
    when exists (
      select 1 from public.relationships r
      where r.type = 'friend'
        and r.status = 'accepted'
        and r.deleted_at is null
        and ((r.requester_id = auth.uid() and r.addressee_id = target)
          or (r.requester_id = target and r.addressee_id = auth.uid()))
    ) then (select p.sharing_level from public.profiles p where p.id = target)
    else 'none'::public.sharing_level
  end
$$;

alter policy sessions_select on public.sessions
  using (user_id = auth.uid() or public.access_level(user_id) = 'full');
alter policy session_checklist_select on public.session_checklist_items
  using (public.access_level(public.session_owner(session_id)) = 'full');
alter policy session_exercises_select on public.session_exercises
  using (public.access_level(public.session_owner(session_id)) = 'full');
alter policy session_sets_select on public.session_sets
  using (public.access_level(public.session_owner(public.session_of_exercise(session_exercise_id))) = 'full');

drop function public.access_level(uuid, uuid);

-- Helpers used only inside policies and triggers: not part of the public API.
do $$
declare
  f text;
begin
  foreach f in array array[
    'public.access_level(uuid)',
    'public.can_read_plan(uuid)',
    'public.owns_plan(uuid)',
    'public.plan_of_day(uuid)',
    'public.owns_exercise(uuid)',
    'public.session_owner(uuid)',
    'public.session_of_exercise(uuid)',
    'public.gym_load(uuid)',
    'public.handle_new_user()'
  ] loop
    execute format('revoke execute on function %s from public, anon', f);
  end loop;
end $$;
