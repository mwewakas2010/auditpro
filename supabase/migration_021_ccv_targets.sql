-- AuditPro — Migration 021: CCV Targets
--
-- Adds a Contractor field to CCVs (the one drill-down dimension that
-- didn't exist yet), and a flexible targets system: separate targets can
-- be set per Section, Site, Department, or Contractor, each with its own
-- period (weekly/monthly/quarterly/annual), a volume target (# of CCVs)
-- and/or a compliance-rate target (% Yes). Targets are standing - set
-- once, compared against whatever the CURRENT period's actual data is,
-- not a one-off date range.

alter table ccv_instances add column if not exists contractor text;

create table if not exists ccv_targets (
  id uuid primary key default gen_random_uuid(),
  owner uuid references auth.users(id) default auth.uid(),
  organization_id uuid references organizations(id),
  company_id uuid references companies(id),
  dimension_type text not null check (dimension_type in ('overall', 'section', 'site', 'department', 'contractor')),
  dimension_value text, -- null when dimension_type = 'overall'
  period_type text not null check (period_type in ('weekly', 'monthly', 'quarterly', 'annual')),
  volume_target int,
  compliance_target_pct numeric check (compliance_target_pct is null or (compliance_target_pct >= 0 and compliance_target_pct <= 100)),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (organization_id, company_id, dimension_type, dimension_value, period_type)
);

alter table ccv_targets enable row level security;

create policy "Owner or org member access" on ccv_targets for all
  using (
    auth.uid() = owner
    or (organization_id is not null and exists (
      select 1 from organization_members
      where organization_members.organization_id = ccv_targets.organization_id
        and organization_members.user_id = auth.uid()
    ))
  )
  with check (
    auth.uid() = owner
    or (organization_id is not null and exists (
      select 1 from organization_members
      where organization_members.organization_id = ccv_targets.organization_id
        and organization_members.user_id = auth.uid()
    ))
  );

-- Computes the boundaries of the CURRENT period (so far) for a given period_type.
create or replace function current_period_start(period_type text)
returns timestamptz
language sql immutable
as $$
  select case period_type
    when 'weekly' then date_trunc('week', now())
    when 'monthly' then date_trunc('month', now())
    when 'quarterly' then date_trunc('quarter', now())
    when 'annual' then date_trunc('year', now())
  end;
$$;

-- Actual-vs-target performance for every target the caller can see,
-- computed against the CURRENT period for each target's period_type.
create or replace function ccv_target_performance(target_org_id uuid default null, target_company_id uuid default null)
returns table (
  target_id uuid, dimension_type text, dimension_value text, period_type text,
  volume_target int, compliance_target_pct numeric,
  actual_volume bigint, actual_compliance_pct numeric
)
language plpgsql security definer set search_path = public
as $$
begin
  return query
    select
      t.id, t.dimension_type, t.dimension_value, t.period_type,
      t.volume_target, t.compliance_target_pct,
      count(distinct c.id) as actual_volume,
      case when count(r.id) > 0
        then round(100.0 * count(r.id) filter (where r.compliance = 'yes') / count(r.id) filter (where r.compliance in ('yes','no')), 1)
        else null
      end as actual_compliance_pct
    from ccv_targets t
    left join ccv_instances c on
      c.created_at >= current_period_start(t.period_type)
      and (t.organization_id is null or c.organization_id = t.organization_id)
      and (t.company_id is null or c.company_id = t.company_id)
      and (
        t.dimension_type = 'overall'
        or (t.dimension_type = 'section' and c.section = t.dimension_value)
        or (t.dimension_type = 'site' and c.site = t.dimension_value)
        or (t.dimension_type = 'department' and c.department = t.dimension_value)
        or (t.dimension_type = 'contractor' and c.contractor = t.dimension_value)
      )
    left join ccv_item_responses r on r.ccv_instance_id = c.id
    where (target_org_id is null or t.organization_id = target_org_id)
      and (target_company_id is null or t.company_id = target_company_id)
      and (auth.uid() = t.owner or (t.organization_id is not null and exists (
        select 1 from organization_members where organization_id = t.organization_id and user_id = auth.uid()
      )))
    group by t.id, t.dimension_type, t.dimension_value, t.period_type, t.volume_target, t.compliance_target_pct;
end;
$$;
