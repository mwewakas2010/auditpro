-- AuditPro — Migration 002: Company / Department model
-- SAFE TO RUN ON TOP OF YOUR EXISTING DATABASE — this does NOT drop any
-- existing tables (unlike the original schema.sql). It only adds new tables
-- and columns, then backfills them from your existing audits' free-text
-- client_name/department fields.

create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  owner uuid references auth.users(id) default auth.uid(),
  name text not null,
  logo_url text,
  created_at timestamptz default now()
);

create table if not exists company_departments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  name text not null,
  created_at timestamptz default now(),
  unique(company_id, name)
);

alter table audits add column if not exists company_id uuid references companies(id);
alter table audits add column if not exists department_id uuid references company_departments(id);

alter table companies enable row level security;
alter table company_departments enable row level security;

drop policy if exists "Owner full access" on companies;
create policy "Owner full access" on companies for all
  using (auth.uid() = owner) with check (auth.uid() = owner);

drop policy if exists "Owner full access via company" on company_departments;
create policy "Owner full access via company" on company_departments for all
  using (exists (select 1 from companies where companies.id = company_departments.company_id and companies.owner = auth.uid()))
  with check (exists (select 1 from companies where companies.id = company_departments.company_id and companies.owner = auth.uid()));

-- One-time backfill: create a Company (and Department, if set) for every
-- distinct client_name your existing audits already have, then link each
-- audit to the right company_id/department_id. Safe to run more than once —
-- it only touches audits where company_id is still null.
do $$
declare
  r record;
  v_company_id uuid;
  v_dept_id uuid;
begin
  for r in
    select distinct owner, client_name, department
    from audits
    where client_name is not null and client_name <> '' and company_id is null
  loop
    select id into v_company_id from companies
      where owner = r.owner and name = r.client_name
      limit 1;

    if v_company_id is null then
      insert into companies (owner, name) values (r.owner, r.client_name)
      returning id into v_company_id;
    end if;

    v_dept_id := null;
    if r.department is not null and r.department <> '' then
      select id into v_dept_id from company_departments
        where company_id = v_company_id and name = r.department
        limit 1;

      if v_dept_id is null then
        insert into company_departments (company_id, name) values (v_company_id, r.department)
        returning id into v_dept_id;
      end if;
    end if;

    update audits
      set company_id = v_company_id, department_id = v_dept_id
      where owner = r.owner and client_name = r.client_name
        and (department = r.department or (department is null and r.department is null))
        and company_id is null;
  end loop;
end $$;
