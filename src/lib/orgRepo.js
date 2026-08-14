import { supabase } from './supabaseClient'

export const PLANS = {
  starter: { name: 'Starter', priceMonthly: 250, priceLabel: 'K250/mo' },
  growth: { name: 'Growth', priceMonthly: 750, priceLabel: 'K750/mo' },
  pro: { name: 'Pro', priceMonthly: 1500, priceLabel: 'K1500/mo' },
}

export async function getMyOrganization() {
  const { data: userData } = await supabase.auth.getUser()
  if (!userData?.user) return null

  const { data: membership, error: memErr } = await supabase
    .from('organization_members')
    .select('role, organizations(*)')
    .eq('user_id', userData.user.id)
    .maybeSingle()

  if (memErr || !membership || !membership.organizations) return null

  const org = membership.organizations
  return {
    id: org.id,
    name: org.name,
    role: membership.role,
    subscriptionStatus: org.subscription_status,
    planTier: org.plan_tier,
    billingInterval: org.billing_interval,
    trialEndsAt: org.trial_ends_at,
    gracePeriodEndsAt: org.grace_period_ends_at,
    currentPeriodEnd: org.current_period_end,
    isSuspended: !!org.is_suspended,
    suspensionReason: org.suspension_reason,
    enabledModules: org.enabled_modules || ['audits', 'flras', 'jsas'],
  }
}

export async function createOrganizationForCurrentUser(orgName) {
  const { data: userData } = await supabase.auth.getUser()
  const owner = userData?.user?.id

  const { data: org, error: orgErr } = await supabase
    .from('organizations')
    .insert({ name: orgName, created_by: owner })
    .select('id')
    .single()
  if (orgErr) throw orgErr

  const { error: memErr } = await supabase
    .from('organization_members')
    .insert({ organization_id: org.id, user_id: owner, role: 'admin' })
  if (memErr) throw memErr

  return org.id
}

export function getAccessState(org) {
  if (!org) return { access: 'full' }

  if (org.isSuspended) {
    return { access: 'restricted', reason: 'suspended', suspensionReason: org.suspensionReason }
  }

  const now = new Date()

  if (org.subscriptionStatus === 'trialing' && org.trialEndsAt) {
    const trialEnd = new Date(org.trialEndsAt)
    const daysLeft = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24))
    if (daysLeft < 0) return { access: 'restricted', reason: 'trial_expired' }
    return { access: 'full', trialDaysLeft: Math.max(0, daysLeft) }
  }

  if (org.subscriptionStatus === 'past_due' && org.gracePeriodEndsAt) {
    const graceEnd = new Date(org.gracePeriodEndsAt)
    const daysLeft = Math.ceil((graceEnd - now) / (1000 * 60 * 60 * 24))
    if (daysLeft < 0) return { access: 'restricted', reason: 'grace_expired' }
    return { access: 'full', graceDaysLeft: Math.max(0, daysLeft) }
  }

  if (org.subscriptionStatus === 'active') return { access: 'full' }
  if (org.subscriptionStatus === 'canceled') return { access: 'restricted', reason: 'canceled' }

  return { access: 'full' }
}

// Public-safe check - doesn't require any special permission, used by the
// sign-up flow itself before allowing an account to be created. If the
// platform-wide allowlist is empty, every domain is allowed (feature off).
export async function isEmailDomainAllowed(email) {
  const { data, error } = await supabase.rpc('is_email_domain_allowed', { check_email: email })
  if (error) return true // fail open rather than blocking sign-ups on an error
  return data
}
