-- AuditPro — Migration 018: Job Safety Analysis (JSA) module
--
-- Genuinely different from FLRA: a formal numeric risk matrix
-- (Likelihood x Consequence -> Raw/Residual Risk), open-ended team-member
-- signatures rather than a fixed two, and a 14-day validity window with
-- mandatory daily re-review signatures for multi-shift use.
--
-- Works for both consultant accounts and subscriber orgs (same dual-access
-- pattern already proven on audits/flra_instances).

create table if not exists jsa_instances (
  id uuid primary key default gen_random_uuid(),
  owner uuid references auth.users(id) default auth.uid(),
  organization_id uuid references organizations(id),
  company_id uuid references companies(id),

  jsa_no text,
  work_order_no text,
  job_task text,
  plant_area text,
  location text,
  jsa_date date,

  senior_supervisor_name text,
  work_group_supervisor_name text,

  permits_required text[] default '{}',
  additional_ppe text,
  special_tools text,
  fatal_risks text[] default '{}',
  hazardous_materials text,
  fire_emergency_equipment text,
  supporting_documents text[] default '{}',
  can_become_sop text check (can_become_sop in ('yes', 'no')),
  potential_hazards text[] default '{}',

  valid_from date,
  valid_until date,

  status text not null default 'in_progress' check (status in ('in_progress', 'final')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists jsa_steps (
  id uuid primary key default gen_random_uuid(),
  jsa_id uuid references jsa_instances(id) on delete cascade,
  step_number int not null,
  job_step text,
  job_step_hazard text,
  current_controls text,
  control_hierarchy text check (control_hierarchy in ('elimination', 'substitution', 'engineering', 'administrative', 'ppe')),
  likelihood int check (likelihood between 1 and 5),
  consequence int check (consequence between 1 and 5),
  required_additional_actions text,
  residual_likelihood int check (residual_likelihood between 1 and 5),
  residual_consequence int check (residual_consequence between 1 and 5)
);

-- Team member acknowledgements + both supervisor sign-offs. Unlike FLRA's
-- fixed two roles, 'team_member' can have any number of rows - one per
-- person who signs. 'senior_supervisor' and 'work_group_supervisor' are
-- each expected to appear once, but not hard-enforced at the DB level.
create table if not exists jsa_signoffs (
  id uuid primary key default gen_random_uuid(),
  jsa_id uuid references jsa_instances(id) on delete cascade,
  role text not null check (role in ('team_member', 'senior_supervisor', 'work_group_supervisor')),
  signatory_name text not null,
  employee_id_no text,
  signature_image text,
  consent_accepted boolean default false,
  user_agent text,
  content_hash text,
  signed_by_user_id uuid references auth.users(id),
  signed_at timestamptz default now()
);

-- Daily re-review signatures, for JSAs reused across multiple shifts
-- within the 14-day validity window.
create table if not exists jsa_daily_reviews (
  id uuid primary key default gen_random_uuid(),
  jsa_id uuid references jsa_instances(id) on delete cascade,
  review_date date not null,
  signatory_name text not null,
  employee_id_no text,
  signature_image text,
  consent_accepted boolean default false,
  user_agent text,
  content_hash text,
  signed_by_user_id uuid references auth.users(id),
  signed_at timestamptz default now()
);

alter table jsa_instances enable row level security;
alter table jsa_steps enable row level security;
alter table jsa_signoffs enable row level security;
alter table jsa_daily_reviews enable row level security;

create policy "Owner or org member access" on jsa_instances for all
  using (
    auth.uid() = owner
    or (organization_id is not null and exists (
      select 1 from organization_members
      where organization_members.organization_id = jsa_instances.organization_id
        and organization_members.user_id = auth.uid()
    ))
  )
  with check (
    auth.uid() = owner
    or (organization_id is not null and exists (
      select 1 from organization_members
      where organization_members.organization_id = jsa_instances.organization_id
        and organization_members.user_id = auth.uid()
    ))
  );

create policy "Owner or org member access via instance" on jsa_steps for all
  using (exists (
    select 1 from jsa_instances where jsa_instances.id = jsa_steps.jsa_id
      and (jsa_instances.owner = auth.uid() or (jsa_instances.organization_id is not null and exists (
        select 1 from organization_members where organization_members.organization_id = jsa_instances.organization_id and organization_members.user_id = auth.uid()
      )))
  ))
  with check (exists (
    select 1 from jsa_instances where jsa_instances.id = jsa_steps.jsa_id
      and (jsa_instances.owner = auth.uid() or (jsa_instances.organization_id is not null and exists (
        select 1 from organization_members where organization_members.organization_id = jsa_instances.organization_id and organization_members.user_id = auth.uid()
      )))
  ));

create policy "Owner or org member access via instance" on jsa_signoffs for all
  using (exists (
    select 1 from jsa_instances where jsa_instances.id = jsa_signoffs.jsa_id
      and (jsa_instances.owner = auth.uid() or (jsa_instances.organization_id is not null and exists (
        select 1 from organization_members where organization_members.organization_id = jsa_instances.organization_id and organization_members.user_id = auth.uid()
      )))
  ))
  with check (exists (
    select 1 from jsa_instances where jsa_instances.id = jsa_signoffs.jsa_id
      and (jsa_instances.owner = auth.uid() or (jsa_instances.organization_id is not null and exists (
        select 1 from organization_members where organization_members.organization_id = jsa_instances.organization_id and organization_members.user_id = auth.uid()
      )))
  ));

create policy "Owner or org member access via instance" on jsa_daily_reviews for all
  using (exists (
    select 1 from jsa_instances where jsa_instances.id = jsa_daily_reviews.jsa_id
      and (jsa_instances.owner = auth.uid() or (jsa_instances.organization_id is not null and exists (
        select 1 from organization_members where organization_members.organization_id = jsa_instances.organization_id and organization_members.user_id = auth.uid()
      )))
  ))
  with check (exists (
    select 1 from jsa_instances where jsa_instances.id = jsa_daily_reviews.jsa_id
      and (jsa_instances.owner = auth.uid() or (jsa_instances.organization_id is not null and exists (
        select 1 from organization_members where organization_members.organization_id = jsa_instances.organization_id and organization_members.user_id = auth.uid()
      )))
  ));
