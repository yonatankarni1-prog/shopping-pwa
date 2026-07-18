alter table households enable row level security;
alter table household_members enable row level security;
alter table items enable row level security;

-- Authorization root: membership row keyed by server-verified auth.uid()
-- (spec §5, Gate 2 #1 — never trust a client-supplied household value).
create policy members_select_own on household_members
  for select to authenticated
  using (user_id = auth.uid());

create policy households_select_member on households
  for select to authenticated
  using (exists (
    select 1 from household_members m
    where m.household_id = households.id and m.user_id = auth.uid()
  ));

create policy items_select_member on items
  for select to authenticated
  using (exists (
    select 1 from household_members m
    where m.household_id = items.household_id and m.user_id = auth.uid()
  ));

create policy items_update_member on items
  for update to authenticated
  using (exists (
    select 1 from household_members m
    where m.household_id = items.household_id and m.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from household_members m
    where m.household_id = items.household_id and m.user_id = auth.uid()
  ));

create policy items_delete_member on items
  for delete to authenticated
  using (exists (
    select 1 from household_members m
    where m.household_id = items.household_id and m.user_id = auth.uid()
  ));

-- Deliberately NO insert policy on items: the only add path is add_item()
-- (SECURITY DEFINER). No policies at all on household_members writes:
-- membership is granted only via join_household().
