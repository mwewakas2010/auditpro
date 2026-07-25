-- AuditPro — Phase 1 persistence schema
-- Run this in the Supabase SQL editor on a fresh project (or drop + rerun if
-- you already ran the earlier draft — this version is simpler and replaces it).

create extension if not exists "pgcrypto";

drop table if exists evidence_files cascade;
drop table if exists checklist_entries cascade;
drop table if exists audit_scope cascade;
drop table if exists audit_signoffs cascade;
drop table if exists audits cascade;

create table audits (
  id uuid primary key default gen_random_uuid(),
  owner uuid references auth.users(id) default auth.uid(),
  client_name text,
  logo_url text,
  standard text not null default 'ISO 45001:2018',
  audit_type text not null default 'internal' check (audit_type in ('internal','second-party','stage1','stage2','followup')),
  department text,
  process_owner text,
  other_participants text,
  lead_auditor text,
  audit_team text,
  start_date date,
  end_date date,
  field_visit_areas text,
  scope_text text,
  methodology text[],
  methodology_narrative text,
  sampling_disclaimer text,
  confidentiality_statement text,
  discontinued boolean default false,
  discontinuation_conditions text[],
  discontinuation_comment text,
  conclusion text default 'suitable_effective',
  status text default 'in_progress' check (status in ('in_progress','draft_issued','final')),
  report_version int default 1,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table audit_scope (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid references audits(id) on delete cascade,
  clause_code text not null,
  in_scope boolean not null default true,
  exclusion_reason text,
  unique(audit_id, clause_code)
);

create table checklist_entries (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid references audits(id) on delete cascade,
  clause_code text not null,
  status text check (status in ('conform','nc','minor','major','ofi','na')),
  evidence_text text,
  evidence_available boolean,
  follow_up_flag boolean default false,
  updated_at timestamptz default now(),
  unique(audit_id, clause_code)
);

create table evidence_files (
  id uuid primary key default gen_random_uuid(),
  checklist_entry_id uuid references checklist_entries(id) on delete cascade,
  file_url text not null,       -- Supabase Storage public URL
  file_name text,
  kind text check (kind in ('photo','file')),
  captured_at timestamptz default now()
);

create table audit_signoffs (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid references audits(id) on delete cascade,
  role text not null check (role in ('lead_auditor','auditee_rep')),
  signatory_name text not null,
  signed_at timestamptz default now(),
  unique(audit_id, role)
);

create index idx_checklist_findings on checklist_entries (audit_id, status)
  where status not in ('conform','na');

alter table audits enable row level security;
alter table audit_scope enable row level security;
alter table checklist_entries enable row level security;
alter table evidence_files enable row level security;
alter table audit_signoffs enable row level security;

create policy "Owner full access" on audits for all
  using (auth.uid() = owner) with check (auth.uid() = owner);

create policy "Owner full access via audit" on audit_scope for all
  using (exists (select 1 from audits where audits.id = audit_scope.audit_id and audits.owner = auth.uid()))
  with check (exists (select 1 from audits where audits.id = audit_scope.audit_id and audits.owner = auth.uid()));

create policy "Owner full access via audit" on checklist_entries for all
  using (exists (select 1 from audits where audits.id = checklist_entries.audit_id and audits.owner = auth.uid()))
  with check (exists (select 1 from audits where audits.id = checklist_entries.audit_id and audits.owner = auth.uid()));

create policy "Owner full access via checklist" on evidence_files for all
  using (exists (
    select 1 from checklist_entries
    join audits on audits.id = checklist_entries.audit_id
    where checklist_entries.id = evidence_files.checklist_entry_id and audits.owner = auth.uid()
  ))
  with check (exists (
    select 1 from checklist_entries
    join audits on audits.id = checklist_entries.audit_id
    where checklist_entries.id = evidence_files.checklist_entry_id and audits.owner = auth.uid()
  ));

create policy "Owner full access via audit" on audit_signoffs for all
  using (exists (select 1 from audits where audits.id = audit_signoffs.audit_id and audits.owner = auth.uid()))
  with check (exists (select 1 from audits where audits.id = audit_signoffs.audit_id and audits.owner = auth.uid()));

-- Storage buckets: create these in the Supabase dashboard (Storage tab),
-- both set to "Public bucket" so report generation can read images directly:
--   1. evidence  — for in-app camera/file evidence uploads
--   2. logos     — for client logo uploads
--
-- Then add these policies (SQL editor) so only authenticated users can write,
-- but anyone with a public URL can read (needed for jsPDF to fetch images):
--
-- create policy "Public read evidence" on storage.objects for select using (bucket_id = 'evidence');
-- create policy "Authenticated write evidence" on storage.objects for insert with check (bucket_id = 'evidence' and auth.role() = 'authenticated');
-- create policy "Authenticated delete evidence" on storage.objects for delete using (bucket_id = 'evidence' and auth.role() = 'authenticated');
-- create policy "Public read logos" on storage.objects for select using (bucket_id = 'logos');
-- create policy "Authenticated write logos" on storage.objects for insert with check (bucket_id = 'logos' and auth.role() = 'authenticated');
