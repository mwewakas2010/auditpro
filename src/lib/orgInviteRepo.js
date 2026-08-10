import { supabase } from './supabaseClient'

export async function createInvite(organizationId) {
  const { data: userData } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('organization_invites')
    .insert({ organization_id: organizationId, created_by: userData?.user?.id })
    .select('token, expires_at')
    .single()
  if (error) throw error
  return data
}

export async function listInvites(organizationId) {
  const { data, error } = await supabase
    .from('organization_invites')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getInviteOrgName(token) {
  const { data, error } = await supabase.rpc('get_invite_org_name', { invite_token: token })
  if (error) throw error
  return data
}

export async function redeemInvite(token) {
  const { data, error } = await supabase.rpc('redeem_invite', { invite_token: token })
  if (error) throw error
  return data // organization_id joined
}

export function buildInviteUrl(token) {
  return `${window.location.origin}/?invite=${token}`
}
