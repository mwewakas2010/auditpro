-- AuditPro — Migration 005: Subscription/trial state for organizations
-- Safe to run on top of existing data — additive only.
-- This is the trial/gating first slice. Real Flutterwave payment
-- processing is a separate, later step — see README.

alter table organizations add column if not exists subscription_status text not null default 'trialing'
  check (subscription_status in ('trialing', 'active', 'past_due', 'canceled'));
alter table organizations add column if not exists plan_tier text check (plan_tier in ('starter', 'growth', 'pro'));
alter table organizations add column if not exists billing_interval text check (billing_interval in ('monthly', 'annual'));
alter table organizations add column if not exists trial_ends_at timestamptz default (now() + interval '30 days');
alter table organizations add column if not exists grace_period_ends_at timestamptz;
alter table organizations add column if not exists current_period_end timestamptz;
alter table organizations add column if not exists flw_customer_email text;

-- Backfill: any organization created before this migration gets a trial
-- window starting now, so nobody already using the app gets abruptly cut off.
update organizations set trial_ends_at = now() + interval '30 days'
  where trial_ends_at is null;
