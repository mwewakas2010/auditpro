import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const ROLE_OPTIONS = [
  { key: 'admin', label: 'Organization Admin' },
  { key: 'manager', label: 'Manager' },
  { key: 'member', label: 'Member' },
  { key: 'viewer', label: 'Viewer' },
]

export default function TeamManagement({ organizationId }) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [busyUserId, setBusyUserId] = useState(null)

  const refresh = () => {
    setLoading(true)
    supabase.rpc('my_org_list_members')
      .then(({ data, error }) => {
        if (error) throw error
        setMembers(data || [])
      })
      .catch((err) => setMsg(`Error: ${err.message}`))
      .finally(() => setLoading(false))
  }

  useEffect(() => { refresh() }, [])

  const handleRoleChange = async (userId, newRole) => {
    setBusyUserId(userId)
    setMsg('')
    try {
      const { error } = await supabase.rpc('set_member_role', { target_user_id: userId, target_org_id: organizationId, new_role: newRole })
      if (error) throw error
      refresh()
    } catch (err) {
      setMsg(`Error: ${err.message}`)
    }
    setBusyUserId(null)
  }

  const handleRemove = async (userId, email) => {
    if (!confirm(`Remove ${email} from your organization?`)) return
    setBusyUserId(userId)
    setMsg('')
    try {
      const { error } = await supabase.rpc('remove_org_member', { target_user_id: userId, target_org_id: organizationId })
      if (error) throw error
      refresh()
    } catch (err) {
      setMsg(`Error: ${err.message}`)
    }
    setBusyUserId(null)
  }

  return (
    <div className="p-4 md:p-9">
      <h1 className="font-display text-xl font-semibold text-navy mb-1">Team</h1>
      <div className="text-xs text-inksoft mb-5">Manage who has access to your organization, and what they can do.</div>

      {msg && <div className={`text-sm mb-4 px-3 py-2 rounded ${msg.startsWith('Error') ? 'bg-majorbg text-major' : 'bg-conformbg text-conform'}`}>{msg}</div>}

      {loading ? (
        <div className="text-sm text-inksoft">Loading…</div>
      ) : (
        <div className="flex flex-col gap-2 max-w-2xl">
          {members.map((m) => (
            <div key={m.user_id} className="flex flex-wrap justify-between items-center gap-2 bg-white border border-line rounded-md px-4 py-3">
              <div className="text-sm">
                <div className="font-medium">{m.email}</div>
                <div className="text-inksoft text-[11px]">Joined {new Date(m.joined_at).toLocaleDateString()}</div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  className="px-2.5 py-1.5 border border-line rounded text-xs"
                  value={m.role}
                  disabled={busyUserId === m.user_id}
                  onChange={(e) => handleRoleChange(m.user_id, e.target.value)}
                >
                  {ROLE_OPTIONS.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
                </select>
                <button
                  disabled={busyUserId === m.user_id}
                  onClick={() => handleRemove(m.user_id, m.email)}
                  className="text-[11px] text-major border border-major/40 px-2.5 py-1.5 rounded disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
          {!members.length && <div className="text-sm text-inksoft italic">No team members yet.</div>}
        </div>
      )}

      <div className="text-[11px] text-inksoft italic mt-4 max-w-2xl">
        Role permissions: Organization Admin has full control. Manager can view everything and resolve actions. Member manages their own records. Viewer has read-only access. Full enforcement of Manager/Viewer restrictions elsewhere in the app is still being built out.
      </div>
    </div>
  )
}
