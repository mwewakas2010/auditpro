import { supabase } from './supabaseClient'

export const PLANS = {
  starter: { label: 'Starter', users: 1, audits: '5 audits/month', priceMonthly: 250, priceAnnual: 2500 },
  growth: { label: 'Growth', users: 5, audits: 'Unlimited audits', priceMonthly: 750, priceAnnual: 7500 },
  pro: { label: 'Pro', users: 'Unlimited', audits: 'Unlimited audits', priceMonthly: 1500, priceAnnual: 15000 },
}

// Returns the organization the current user belongs to, or null if they
// have none (which is the case for the SentinelPro consultant account —
// that account was never signed up through the org flow).
export async function getMyOrganization() {
  const { data: userData } = await supabase.auth.getUser()
  const userId = userData?.user?.id
  if (!userId) return null

  const { data: membership, error: memErr } = await supabase
    .from('organization_members')
    .select('organization_id, role, organizations(id, name, subscription_status, plan_tier, billing_interval, trial_ends_at, grace_period_ends_at, current_period_end)')
    .eq('user_id', userId)
    .maybeSingle()
  if (memErr) throw memErr
  if (!membership) return null

  const org = membership.organizations
  return {
    id: membership.organization_id,
    name: org?.name,
    role: membership.role,
    subscriptionStatus: org?.subscription_status,
    planTier: org?.plan_tier,
    billingInterval: org?.billing_interval,
    trialEndsAt: org?.trial_ends_at,
    gracePeriodEndsAt: org?.grace_period_ends_at,
    currentPeriodEnd: org?.current_period_end,
  }
}

// Creates a brand-new organization and makes the current user its admin.
// Called right after sign-up. Trial window is set at the database level
// (see migration_005_billing.sql), so it's automatic here.
export async function createOrganizationForCurrentUser(orgName) {
  const { data: userData } = await supabase.auth.getUser()
  const userId = userData?.user?.id
  if (!userId) throw new Error('Not signed in')

  const { data: org, error: orgErr } = await supabase
    .from('organizations')
    .insert({ name: orgName, created_by: userId })
    .select('id, name')
    .single()
  if (orgErr) throw orgErr

  const { error: memErr } = await supabase
    .from('organization_members')
    .insert({ organization_id: org.id, user_id: userId, role: 'admin' })
  if (memErr) throw memErr

  return org
}

// Computes what the organization can actually do right now, given its trial/
// subscription state. This is the single source of truth for access gating —
// used by SubscriberShell to decide whether to show the normal app or the
// Billing screen.
export function getAccessState(org) {
  if (!org) return { access: 'full' } // consultant accounts have no org - always full access

  const now = new Date()

  if (org.subscriptionStatus === 'active') {
    return { access: 'full' }
  }

  if (org.subscriptionStatus === 'trialing') {
    const trialEnd = org.trialEndsAt ? new Date(org.trialEndsAt) : null
    if (trialEnd && trialEnd > now) {
      const daysLeft = Math.max(0, Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24)))
      return { access: 'full', trialDaysLeft: daysLeft }
    }
    return { access: 'restricted', reason: 'trial_expired' }
  }

  if (org.subscriptionStatus === 'past_due') {
    const graceEnd = org.gracePeriodEndsAt ? new Date(org.gracePeriodEndsAt) : null
    if (graceEnd && graceEnd > now) {
      const daysLeft = Math.max(0, Math.ceil((graceEnd - now) / (1000 * 60 * 60 * 24)))
      return { access: 'full', graceDaysLeft: daysLeft, reason: 'payment_failed' }
    }
    return { access: 'restricted', reason: 'payment_failed' }
  }

  // 'canceled', or anything unexpected
  return { access: 'restricted', reason: 'canceled' }
}
