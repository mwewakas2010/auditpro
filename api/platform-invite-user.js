import { createClient } from '@supabase/supabase-js'

// Platform Admin invite endpoint. Two-step security:
// 1. Verify the CALLER is a platform admin, using their own session token
//    (so this can't be called by just anyone with the URL).
// 2. Only then use the SERVICE ROLE KEY (server-side only, never sent to
//    the browser) to actually create the invited user's account and add
//    them to the target organization.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Not authenticated' })
  }
  const callerToken = authHeader.replace('Bearer ', '')

  const { email, organizationId, role } = req.body || {}
  if (!email || !organizationId || !role) {
    return res.status(400).json({ error: 'Missing email, organizationId, or role' })
  }
  if (!['admin', 'member'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' })
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return res.status(500).json({ error: 'Server is missing required Supabase configuration' })
  }

  try {
    // Step 1: verify caller is a platform admin, using THEIR OWN session
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${callerToken}` } },
    })
    const { data: isAdmin, error: adminCheckError } = await callerClient.rpc('is_platform_admin')
    if (adminCheckError || !isAdmin) {
      return res.status(403).json({ error: 'Not authorized — Platform Admin access required' })
    }

    // Step 2: use the service role to actually invite + add membership
    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email)
    if (inviteError) {
      return res.status(500).json({ error: `Could not send invite: ${inviteError.message}` })
    }

    const newUserId = inviteData.user.id
    const { error: memberError } = await adminClient
      .from('organization_members')
      .insert({ organization_id: organizationId, user_id: newUserId, role })

    if (memberError) {
      return res.status(500).json({ error: `Invite sent, but could not add them to the organization: ${memberError.message}` })
    }

    return res.status(200).json({ success: true, userId: newUserId })
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unexpected server error' })
  }
}
