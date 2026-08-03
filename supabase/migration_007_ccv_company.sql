-- AuditPro — Migration 007: Link CCVs to existing Companies
-- Safe to run on top of existing data — additive only, one nullable column.

alter table ccv_instances add column if not exists company_id uuid references companies(id);
