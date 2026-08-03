-- AuditPro — Migration 006: Checklist Template System + Critical Controls
-- Verification (CCV) module
-- Safe to run on top of existing data — additive only.
--
-- This is a GENERAL template system (categories + items + response type),
-- not a CCV-specific one-off. The Mobile Equipment CCV form is seeded as
-- the first real template using this structure. An in-app template
-- builder (so templates can be created without a migration) is deferred
-- to a later pass — for now, new templates get added the same way this
-- one was: as seed data.

create table if not exists checklist_templates (
  id uuid primary key default gen_random_uuid(),
  owner uuid references auth.users(id) default auth.uid(),
  name text not null,
  document_reference text,
  revision_number text,
  total_pages text,
  date_of_issue date,
  date_of_next_review date,
  created_at timestamptz default now()
);

create table if not exists checklist_template_categories (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references checklist_templates(id) on delete cascade,
  category_number text not null,   -- e.g. '1.0'
  name text not null,               -- e.g. 'SAFE DRIVING'
  sort_order int not null default 0
);

create table if not exists checklist_template_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references checklist_template_categories(id) on delete cascade,
  item_number text not null,        -- e.g. '1.1'
  requirement_text text not null,
  sort_order int not null default 0
);

create table if not exists ccv_instances (
  id uuid primary key default gen_random_uuid(),
  owner uuid references auth.users(id) default auth.uid(),
  template_id uuid references checklist_templates(id),
  assessors text,
  date_time timestamptz,
  location text,
  department text,
  section text,
  status text not null default 'in_progress' check (status in ('in_progress', 'final')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists ccv_item_responses (
  id uuid primary key default gen_random_uuid(),
  ccv_instance_id uuid references ccv_instances(id) on delete cascade,
  template_item_id uuid references checklist_template_items(id),
  compliance text check (compliance in ('yes', 'no')),
  action_text text,          -- only meaningful when compliance = 'no'
  responsible_person text,   -- only meaningful when compliance = 'no'
  due_date date,             -- only meaningful when compliance = 'no'
  updated_at timestamptz default now(),
  unique(ccv_instance_id, template_item_id)
);

create table if not exists ccv_evidence_files (
  id uuid primary key default gen_random_uuid(),
  ccv_item_response_id uuid references ccv_item_responses(id) on delete cascade,
  file_url text not null,
  file_name text,
  kind text check (kind in ('photo', 'file')),
  captured_at timestamptz default now()
);

alter table checklist_templates enable row level security;
alter table checklist_template_categories enable row level security;
alter table checklist_template_items enable row level security;
alter table ccv_instances enable row level security;
alter table ccv_item_responses enable row level security;
alter table ccv_evidence_files enable row level security;

create policy "Owner full access" on checklist_templates for all
  using (auth.uid() = owner) with check (auth.uid() = owner);

create policy "Owner full access via template" on checklist_template_categories for all
  using (exists (select 1 from checklist_templates where checklist_templates.id = checklist_template_categories.template_id and checklist_templates.owner = auth.uid()))
  with check (exists (select 1 from checklist_templates where checklist_templates.id = checklist_template_categories.template_id and checklist_templates.owner = auth.uid()));

create policy "Owner full access via category" on checklist_template_items for all
  using (exists (
    select 1 from checklist_template_categories
    join checklist_templates on checklist_templates.id = checklist_template_categories.template_id
    where checklist_template_categories.id = checklist_template_items.category_id and checklist_templates.owner = auth.uid()
  ))
  with check (exists (
    select 1 from checklist_template_categories
    join checklist_templates on checklist_templates.id = checklist_template_categories.template_id
    where checklist_template_categories.id = checklist_template_items.category_id and checklist_templates.owner = auth.uid()
  ));

create policy "Owner full access" on ccv_instances for all
  using (auth.uid() = owner) with check (auth.uid() = owner);

create policy "Owner full access via instance" on ccv_item_responses for all
  using (exists (select 1 from ccv_instances where ccv_instances.id = ccv_item_responses.ccv_instance_id and ccv_instances.owner = auth.uid()))
  with check (exists (select 1 from ccv_instances where ccv_instances.id = ccv_item_responses.ccv_instance_id and ccv_instances.owner = auth.uid()));

create policy "Owner full access via response" on ccv_evidence_files for all
  using (exists (
    select 1 from ccv_item_responses
    join ccv_instances on ccv_instances.id = ccv_item_responses.ccv_instance_id
    where ccv_item_responses.id = ccv_evidence_files.ccv_item_response_id and ccv_instances.owner = auth.uid()
  ))
  with check (exists (
    select 1 from ccv_item_responses
    join ccv_instances on ccv_instances.id = ccv_item_responses.ccv_instance_id
    where ccv_item_responses.id = ccv_evidence_files.ccv_item_response_id and ccv_instances.owner = auth.uid()
  ));

-- ================= SEED: Mobile Equipment Critical Control Verification =================
-- This runs once. If you re-run this migration, it will create a duplicate
-- template — check checklist_templates for an existing 'Mobile Equipment
-- Critical Control Verification' row before re-running, or delete the old
-- one first (cascades to categories/items automatically).

do $$
declare
  v_template_id uuid;
  v_cat_id uuid;
begin
  insert into checklist_templates (name, document_reference, revision_number, total_pages, date_of_issue, date_of_next_review)
  values ('Mobile Equipment Critical Control Verification', 'FM0635', '01', '3', '2024-05-15', '2029-05-14')
  returning id into v_template_id;

  insert into checklist_template_categories (template_id, category_number, name, sort_order) values (v_template_id, '1.0', 'SAFE DRIVING', 1) returning id into v_cat_id;
  insert into checklist_template_items (category_id, item_number, requirement_text, sort_order) values
    (v_cat_id, '1.1', 'Is the team member alert, rested, and free of distractions?', 1),
    (v_cat_id, '1.2', 'Is team member aware of and complying with posted speed limits and changing road conditions?', 2),
    (v_cat_id, '1.3', 'Are electronic devices secured and put away?', 3);

  insert into checklist_template_categories (template_id, category_number, name, sort_order) values (v_template_id, '2.0', 'SAFETY DEVICES', 2) returning id into v_cat_id;
  insert into checklist_template_items (category_id, item_number, requirement_text, sort_order) values
    (v_cat_id, '2.1', 'Are visibility accessories (i.e., strobe lights, reflective tape, buggy whip, etc.) installed, functional, and maintained?', 1),
    (v_cat_id, '2.2', 'Are all safety critical items installed and functioning properly prior to operating equipment? (i.e., tires, brakes, steering, horn, alarms, cameras, maintenance up-to-date, Fatigue Monitoring, etc.)', 2),
    (v_cat_id, '2.3', 'Have all seatbelts been inspected for damage (tears, cuts, frays, etc.), and determined to be in good operable condition and worn correctly?', 3);

  insert into checklist_template_categories (template_id, category_number, name, sort_order) values (v_template_id, '3.0', 'VEHICLE / PEDESTRIAN SEGREGATION', 3) returning id into v_cat_id;
  insert into checklist_template_items (category_id, item_number, requirement_text, sort_order) values
    (v_cat_id, '3.1', 'Has interaction between vehicles and pedestrians been minimized by physical barriers, designated walkways/travel ways, work area exclusion zones?', 1),
    (v_cat_id, '3.2', 'In parking areas and other congested traffic areas, are berms installed and maintained to minimize vehicle interactions?', 2),
    (v_cat_id, '3.3', 'Are vehicles operating at the required separation distance per Traffic Management Plan?', 3),
    (v_cat_id, '3.4', 'Do employee(s) avoid entering equipment blind spots unless positive communication is established, equipment is shut down, secured from movement i.e., chocks in place and blades/buckets are lowered into the ground?', 4);

  insert into checklist_template_categories (template_id, category_number, name, sort_order) values (v_template_id, '4.0', 'BERMS', 4) returning id into v_cat_id;
  insert into checklist_template_items (category_id, item_number, requirement_text, sort_order) values
    (v_cat_id, '4.1', 'Are berms built with competent material to the mid-axel height of the largest vehicle travelling the area to prevent vehicles from falling over the edge or overturning (i.e., dumps, stopes, travel ways, TSF, etc.)?', 1);

  insert into checklist_template_categories (template_id, category_number, name, sort_order) values (v_template_id, '5.0', 'STABLE PARKING AND SECURED LOADS', 5) returning id into v_cat_id;
  insert into checklist_template_items (category_id, item_number, requirement_text, sort_order) values
    (v_cat_id, '5.1', 'Is the vehicle or equipment parked in a designated or segregated parking area?', 1),
    (v_cat_id, '5.2', 'Are loads and loose items that could become a hazard or risk secured?', 2),
    (v_cat_id, '5.3', 'Is the park / service brake set, other suitable brakes applied, and the vehicle blocked against movement? (wheel chocks, parking ditches, equipment bermed/ribbed, implements - blades/buckets/rippers/etc. lowered into the ground)', 3);

  insert into checklist_template_categories (template_id, category_number, name, sort_order) values (v_template_id, '6.0', 'COMMUNICATION', 6) returning id into v_cat_id;
  insert into checklist_template_items (category_id, item_number, requirement_text, sort_order) values
    (v_cat_id, '6.1', 'Are radios installed, present, and operational in vehicles/equipment in required areas (i.e., active mining area, hauls, stockpiles, restricted areas, etc.)?', 1),
    (v_cat_id, '6.2', 'Is positive two-way communication made when passing equipment or when entering exclusion zones?', 2);

  insert into checklist_template_categories (template_id, category_number, name, sort_order) values (v_template_id, '7.0', 'ENGINEERED FIRE DETECTION AND SUPPRESSION SYSTEM', 7) returning id into v_cat_id;
  insert into checklist_template_items (category_id, item_number, requirement_text, sort_order) values
    (v_cat_id, '7.1', 'Is the equipment fitted with the appropriate fire suppression system and/or fire extinguisher? (LV exempt unless otherwise noted)', 1),
    (v_cat_id, '7.2', 'Has the employee inspected the fire suppression system and/or fire extinguisher(s) prior to operation?', 2);
end $$;
