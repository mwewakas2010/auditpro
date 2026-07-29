-- AuditPro — Migration 004: Organizations (subscriber self-service mode)
-- Safe to run on top of your existing data — additive only, nothing dropped.
-- This does NOT change how your existing SentinelPro consultant account
-- works at all (it has no organization membership, so none of this new
-- logic applies to it).

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create table if not exists organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  user_id uuid references auth.users(id),
  role text not null default 'admin' check (role in ('admin', 'member')),
  created_at timestamptz default now(),
  unique(organization_id, user_id)
);

alter table audits add column if not exists organization_id uuid references organizations(id);

alter table organizations enable row level security;
alter table organization_members enable row level security;

drop policy if exists "Members can view their org" on organizations;
create policy "Members can view their org" on organizations for select
  using (exists (select 1 from organization_members where organization_members.organization_id = organizations.id and organization_members.user_id = auth.uid()));

drop policy if exists "Creator can update their org" on organizations;
create policy "Creator can update their org" on organizations for update
  using (created_by = auth.uid());

drop policy if exists "Anyone authenticated can create an org" on organizations;
create policy "Anyone authenticated can create an org" on organizations for insert
  with check (auth.uid() = created_by);

drop policy if exists "Members can view membership rows for their org" on organization_members;
-- IMPORTANT: this must NOT query organization_members from within its own
-- policy (a self-join here causes "infinite recursion detected in policy" -
-- Postgres has to re-evaluate this same policy to evaluate the subquery).
-- For this first slice, each user only ever needs to see their own
-- membership row (to look up which org they belong to), so a direct check
-- is both correct and safe. If team member lists are added later, that
-- would need a SECURITY DEFINER helper function instead of a plain policy.
create policy "Users can view their own membership" on organization_members for select
  using (user_id = auth.uid());

drop policy if exists "Users can insert their own membership" on organization_members;
create policy "Users can insert their own membership" on organization_members for insert
  with check (user_id = auth.uid());

-- Extend the existing audits RLS to also allow access via organization
-- membership, WITHOUT changing the existing owner-based access at all.
-- Your SentinelPro account keeps working exactly as before (owner = auth.uid());
-- subscriber-org audits additionally allow any member of that organization.
drop policy if exists "Owner full access" on audits;
create policy "Owner or org member access" on audits for all
  using (
    auth.uid() = owner
    or (organization_id is not null and exists (
      select 1 from organization_members
      where organization_members.organization_id = audits.organization_id
        and organization_members.user_id = auth.uid()
    ))
  )
  with check (
    auth.uid() = owner
    or (organization_id is not null and exists (
      select 1 from organization_members
      where organization_members.organization_id = audits.organization_id
        and organization_members.user_id = auth.uid()
    ))
  );

-- IMPORTANT: audit_scope / checklist_entries / evidence_files / audit_signoffs
-- each check `audits.owner = auth.uid()` directly inside their own EXISTS
-- subquery — that check does NOT automatically inherit the org-membership
-- clause just added to the audits table's own policy above, since each
-- table's RLS is independent. These four need the same org-membership OR
-- added explicitly, or org members would still be blocked from every part
-- of an audit except the top-level audits row itself.

drop policy if exists "Owner full access via audit" on audit_scope;
create policy "Owner or org member access via audit" on audit_scope for all
  using (exists (
    select 1 from audits where audits.id = audit_scope.audit_id
      and (audits.owner = auth.uid() or (audits.organization_id is not null and exists (
        select 1 from organization_members where organization_members.organization_id = audits.organization_id and organization_members.user_id = auth.uid()
      )))
  ))
  with check (exists (
    select 1 from audits where audits.id = audit_scope.audit_id
      and (audits.owner = auth.uid() or (audits.organization_id is not null and exists (
        select 1 from organization_members where organization_members.organization_id = audits.organization_id and organization_members.user_id = auth.uid()
      )))
  ));

drop policy if exists "Owner full access via audit" on checklist_entries;
create policy "Owner or org member access via audit" on checklist_entries for all
  using (exists (
    select 1 from audits where audits.id = checklist_entries.audit_id
      and (audits.owner = auth.uid() or (audits.organization_id is not null and exists (
        select 1 from organization_members where organization_members.organization_id = audits.organization_id and organization_members.user_id = auth.uid()
      )))
  ))
  with check (exists (
    select 1 from audits where audits.id = checklist_entries.audit_id
      and (audits.owner = auth.uid() or (audits.organization_id is not null and exists (
        select 1 from organization_members where organization_members.organization_id = audits.organization_id and organization_members.user_id = auth.uid()
      )))
  ));

drop policy if exists "Owner full access via checklist" on evidence_files;
create policy "Owner or org member access via checklist" on evidence_files for all
  using (exists (
    select 1 from checklist_entries join audits on audits.id = checklist_entries.audit_id
    where checklist_entries.id = evidence_files.checklist_entry_id
      and (audits.owner = auth.uid() or (audits.organization_id is not null and exists (
        select 1 from organization_members where organization_members.organization_id = audits.organization_id and organization_members.user_id = auth.uid()
      )))
  ))
  with check (exists (
    select 1 from checklist_entries join audits on audits.id = checklist_entries.audit_id
    where checklist_entries.id = evidence_files.checklist_entry_id
      and (audits.owner = auth.uid() or (audits.organization_id is not null and exists (
        select 1 from organization_members where organization_members.organization_id = audits.organization_id and organization_members.user_id = auth.uid()
      )))
  ));

drop policy if exists "Owner full access via audit" on audit_signoffs;
create policy "Owner or org member access via audit" on audit_signoffs for all
  using (exists (
    select 1 from audits where audits.id = audit_signoffs.audit_id
      and (audits.owner = auth.uid() or (audits.organization_id is not null and exists (
        select 1 from organization_members where organization_members.organization_id = audits.organization_id and organization_members.user_id = auth.uid()
      )))
  ))
  with check (exists (
    select 1 from audits where audits.id = audit_signoffs.audit_id
      and (audits.owner = auth.uid() or (audits.organization_id is not null and exists (
        select 1 from organization_members where organization_members.organization_id = audits.organization_id and organization_members.user_id = auth.uid()
      )))
  ));

