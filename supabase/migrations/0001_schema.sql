create extension if not exists pgcrypto;

create table households (
  id uuid primary key default gen_random_uuid(),
  invite_code text not null unique default encode(gen_random_bytes(8), 'hex'),
  created_at timestamptz not null default now()
);

create table household_members (
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create table items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  normalized text not null,
  qty int not null default 1 check (qty >= 1),
  bought boolean not null default false,
  source text not null check (source in ('manual', 'whatsapp')),
  added_by uuid,
  created_at timestamptz not null default now(),
  bought_at timestamptz
);

-- Lookup performance only. NOT unique — the one-active-row invariant is
-- enforced by add_item's advisory lock (spec §3, Gate 2 #2+#3).
create index items_active_lookup on items (household_id, normalized) where bought = false;

-- Conservative normalization. The ONLY normalization implementation (spec §6).
-- Hebrew letter range א-ת is whitelisted explicitly so behavior does
-- not depend on DB locale classifying Hebrew as [:alnum:].
create or replace function normalize_name(p_input text)
returns text
language sql
immutable
as $fn$
  select nullif(
    trim(
      regexp_replace(
        regexp_replace(
          regexp_replace(lower(coalesce(p_input, '')), '[֑-ׇ׳״''"]', '', 'g'),
          '[^[:alnum:][:space:]א-ת]', ' ', 'g'
        ),
        '\s+', ' ', 'g'
      )
    ),
  '')
$fn$;

-- Realtime: full old-row payloads so RLS filtering + delete events work.
alter table items replica identity full;
alter publication supabase_realtime add table items;
