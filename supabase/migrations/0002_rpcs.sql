-- Single mutation for BOTH sources (spec §4.3, Gate 2 #2/#3).
create or replace function add_item(
  p_household_id uuid,
  p_name text,
  p_source text default 'manual'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_uid uuid := auth.uid();
  v_role text := coalesce(auth.jwt() ->> 'role', '');
  v_norm text;
  v_item items%rowtype;
  v_qty int;
begin
  -- Edge Function calls with service_role; PWA users must be members.
  if v_role <> 'service_role' then
    if v_uid is null or not exists (
      select 1 from household_members m
      where m.household_id = p_household_id and m.user_id = v_uid
    ) then
      raise exception 'not_a_member' using errcode = '42501';
    end if;
  end if;

  if p_source not in ('manual', 'whatsapp') then
    raise exception 'invalid_source';
  end if;

  v_norm := normalize_name(p_name);
  if v_norm is null then
    raise exception 'empty_name';
  end if;

  -- One-active-row invariant under concurrency (spec §3): serialize per
  -- (household, normalized) for this transaction only.
  perform pg_advisory_xact_lock(hashtextextended(p_household_id::text || ':' || v_norm, 0));

  select * into v_item
  from items
  where household_id = p_household_id and normalized = v_norm and bought = false
  limit 1;

  if found then
    update items set qty = qty + 1 where id = v_item.id returning qty into v_qty;
    return jsonb_build_object('status', 'existing', 'id', v_item.id, 'name', v_item.name, 'qty', v_qty);
  end if;

  insert into items (household_id, name, normalized, source, added_by)
  values (p_household_id, trim(p_name), v_norm, p_source, v_uid)
  returning * into v_item;

  return jsonb_build_object('status', 'created', 'id', v_item.id, 'name', v_item.name, 'qty', 1);
end;
$fn$;

revoke execute on function add_item(uuid, text, text) from public, anon;
grant execute on function add_item(uuid, text, text) to authenticated, service_role;

-- Invite redemption (spec §5).
create or replace function join_household(p_invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_uid uuid := auth.uid();
  v_hid uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  select id into v_hid from households where invite_code = p_invite_code;
  if v_hid is null then
    raise exception 'invalid_invite';
  end if;
  insert into household_members (household_id, user_id)
  values (v_hid, v_uid)
  on conflict do nothing;
  return v_hid;
end;
$fn$;

revoke execute on function join_household(text) from public, anon;
grant execute on function join_household(text) to authenticated;

-- Direct updates (bought toggle from PWA; any future name edit) stay
-- consistent: normalized always derived from name; bought_at maintained here
-- so clients only ever touch the bought column.
create or replace function items_sync_on_update()
returns trigger
language plpgsql
set search_path = public
as $fn$
begin
  new.normalized := normalize_name(new.name);
  if new.normalized is null then
    raise exception 'empty_name';
  end if;
  if new.bought and not old.bought then
    new.bought_at := now();
  elsif not new.bought then
    new.bought_at := null;
  end if;
  return new;
end;
$fn$;

create trigger items_before_update
  before update on items
  for each row execute function items_sync_on_update();
