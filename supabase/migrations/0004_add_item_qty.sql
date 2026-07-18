-- Fix: the created-branch of add_item hardcoded qty=1 in its response instead
-- of returning the row's actual qty column (final-review F7). Copied verbatim
-- from 0002_rpcs.sql — only the created-branch return changed. Never edit 0002.
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

  return jsonb_build_object('status', 'created', 'id', v_item.id, 'name', v_item.name, 'qty', v_item.qty);
end;
$fn$;

revoke execute on function add_item(uuid, text, text) from public, anon;
grant execute on function add_item(uuid, text, text) to authenticated, service_role;
