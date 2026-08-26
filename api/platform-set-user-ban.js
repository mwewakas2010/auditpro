import { createClient } from '@supabase/supabase-js'

// Blocks or unblocks a user platform-wide, using Supabase's built-in auth
// ban mechanism (banned_until on auth.users) - never true account
// deletion, so every record they ever created stays intact and correctly
// attributed. Both "Block" and "Delete Account" in the UI call this same
// endpoint; the distinction is purely in how the UI frames/confirms it.
//
// Same two-step security pattern as platform-invite-user.js: verify the
// caller is a genuine Platform Admin using THEIR OWN session token first,
// then use the service role key only for the actual privileged operation.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Not authenticated' })
  }
  const callerToken = authHeader.replace('Bearer ', '')

  const { userId, banned } = req.body || {}
  if (!userId || typeof banned !== 'boolean') {
    return res.status(400).json({ error: 'Missing userId or banned (boolean)' })
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

    // Step 2: use the service role to perform the actual privileged operation
    const adminClient = createClient(supabaseUrl, serviceRoleKey)
    const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, {
      ban_duration: banned ? '87600h' : 'none', // ~10 years = effectively permanent, but always reversible
    })
    if (updateError) {
      return res.status(500).json({ error: `Could not update block status: ${updateError.message}` })
    }

    return res.status(200).json({ success: true, userId, banned })
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unexpected server error' })
  }
}
