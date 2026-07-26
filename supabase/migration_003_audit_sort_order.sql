-- AuditPro — Migration 003: manual sort order for My Audits list
-- Safe to run on top of your existing data — only adds a column.

alter table audits add column if not exists sort_order integer default 0;
