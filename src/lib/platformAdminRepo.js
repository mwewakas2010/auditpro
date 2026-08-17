import { supabase } from './supabaseClient'

// Every function here calls a SECURITY DEFINER database function that
// checks is_platform_admin() internally - a non-admin calling these will
// get an authorization error back from Postgres, not real data.

export async function isPlatformAdmin() {
  const { data, error } = await supabase.rpc('is_platform_admin')
  if (error) return false
  return !!data
}

export async function listAllOrganizations() {
  const { data, error } = await supabase.rpc('platform_list_organizations')
  if (error) throw error
  return data
}

export async function createOrganization(orgName, planTier = 'starter', subscriptionStatus = 'trialing') {
  const { data, error } = await supabase.rpc('platform_create_organization', { org_name: orgName, initial_plan_tier: planTier, initial_subscription_status: subscriptionStatus })
  if (error) throw error
  return data // new org id
}

export async function getBillingSummary() {
  const { data, error } = await supabase.rpc('platform_billing_summary')
  if (error) throw error
  return data?.[0] || null
}

export async function viewOrgAudits(organizationId) {
  const { data, error } = await supabase.rpc('platform_view_org_audits', { target_org_id: organizationId })
  if (error) throw error
  return data
}

// ---- Platform Admin management ----

export async function listPlatformAdmins() {
  const { data, error } = await supabase.rpc('platform_list_admins')
  if (error) throw error
  return data
}

export async function addPlatformAdmin(email) {
  const { error } = await supabase.rpc('platform_add_admin', { target_email: email })
  if (error) throw error
}

export async function removePlatformAdmin(userId) {
  const { error } = await supabase.rpc('platform_remove_admin', { target_user_id: userId })
  if (error) throw error
}

// ---- Direct add of an existing user to an org ----
// Throws with message 'NO_ACCOUNT' if the email has no AuditPro account yet
// - the caller should fall back to inviteUserByEmail() in that case.

export async function addExistingUserToOrg(email, organizationId, role) {
  const { error } = await supabase.rpc('platform_add_user_to_org', { target_email: email, target_org_id: organizationId, target_role: role })
  if (error) throw error
}

// ---- Invite a brand-new user by email (server-side, sends real email) ----

export async function inviteUserByEmail(email, organizationId, role) {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData?.session?.access_token
  const res = await fetch('/api/platform-invite-user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ email, organizationId, role }),
  })
  const result = await res.json()
  if (!res.ok) throw new Error(result.error || 'Invite failed')
  return result
}

// ---- Org control: modules, suspension, billing ----

export async function setOrgModules(organizationId, modules) {
  const { error } = await supabase.rpc('platform_set_org_modules', { target_org_id: organizationId, modules })
  if (error) throw error
}

export async function setOrgSuspended(organizationId, suspended, reason) {
  const { error } = await supabase.rpc('platform_set_org_suspended', { target_org_id: organizationId, suspended, reason: reason || null })
  if (error) throw error
}

export async function updateOrgBilling(organizationId, planTier, subscriptionStatus, billingInterval) {
  const { error } = await supabase.rpc('platform_update_org_billing', {
    target_org_id: organizationId,
    new_plan_tier: planTier,
    new_subscription_status: subscriptionStatus,
    new_billing_interval: billingInterval,
  })
  if (error) throw error
}

// ---- Email-domain allowlist ----

export async function listAllowedDomains() {
  const { data, error } = await supabase.rpc('platform_list_allowed_domains')
  if (error) throw error
  return data
}

export async function addAllowedDomain(domain) {
  const { error } = await supabase.rpc('platform_add_allowed_domain', { new_domain: domain })
  if (error) throw error
}

export async function removeAllowedDomain(domain) {
  const { error } = await supabase.rpc('platform_remove_allowed_domain', { target_domain: domain })
  if (error) throw error
}
