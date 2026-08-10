-- AuditPro — Migration 016: FLRA interactive risk-controls verification
--
-- Adds real data capture for the "In Place / Not in Place" controls table
-- per selected Fatal Risk (previously this was just a read-only reference
-- hint with no data captured at all), plus tracking that the mandatory
-- STOP/responsibility landing page was actually read and acknowledged
-- before the FLRA was started.

create table if not exists flra_risk_controls (
  id uuid primary key default gen_random_uuid(),
  flra_id uuid references flra_instances(id) on delete cascade,
  fatal_risk text not null,
  control_key text not null,
  control_text text not null,
  status text check (status in ('in_place', 'not_in_place')),
  action_text text,
  responsible_person text,
  due_date date,
  addressed boolean not null default false,
  updated_at timestamptz default now(),
  unique(flra_id, control_key)
);

alter table flra_risk_controls enable row level security;

create policy "Owner or org member access via instance" on flra_risk_controls for all
  using (exists (
    select 1 from flra_instances where flra_instances.id = flra_risk_controls.flra_id
      and (flra_instances.owner = auth.uid() or (flra_instances.organization_id is not null and exists (
        select 1 from organization_members where organization_members.organization_id = flra_instances.organization_id and organization_members.user_id = auth.uid()
      )))
  ))
  with check (exists (
    select 1 from flra_instances where flra_instances.id = flra_risk_controls.flra_id
      and (flra_instances.owner = auth.uid() or (flra_instances.organization_id is not null and exists (
        select 1 from organization_members where organization_members.organization_id = flra_instances.organization_id and organization_members.user_id = auth.uid()
      )))
  ));

-- Landing-page acknowledgment: who acknowledged it, when.
alter table flra_instances add column if not exists acknowledged_at timestamptz;
alter table flra_instances add column if not exists acknowledged_by uuid references auth.users(id);
