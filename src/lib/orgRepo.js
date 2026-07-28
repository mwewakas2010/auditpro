import { supabase } from './supabaseClient'

// Returns the organization the current user belongs to, or null if they
// have none (which is the case for the SentinelPro consultant account —
// that account was never signed up through the org flow).
export async function getMyOrganization() {
  const { data: userData } = await supabase.auth.getUser()
  const userId = userData?.user?.id
  if (!userId) return null

  const { data: membership, error: memErr } = await supabase
    .from('organization_members')
    .select('organization_id, role, organizations(id, name)')
    .eq('user_id', userId)
    .maybeSingle()
  if (memErr) throw memErr
  if (!membership) return null

  return { id: membership.organization_id, name: membership.organizations?.name, role: membership.role }
}

// Creates a brand-new organization and makes the current user its admin.
// Called right after sign-up.
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
