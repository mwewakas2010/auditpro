import { useEffect, useState } from 'react'
import { uploadDataUrl } from '../lib/auditRepo'
import { supabase } from '../lib/supabaseClient'
import {
  listAllOrganizations, createOrganization, getBillingSummary,
  listPlatformAdmins, addPlatformAdmin, removePlatformAdmin,
  addExistingUserToOrg, inviteUserByEmail,
  setOrgModules, setOrgSuspended, updateOrgBilling,
} from '../lib/platformAdminRepo'

const MODULE_OPTIONS = [
  { key: 'audits', label: 'Audits' },
  { key: 'flras', label: 'FLRAs' },
  { key: 'jsas', label: 'JSAs' },
]

// ---- Simple inline SVG bar chart, no external library needed ----
function BarChart({ data, width = 560, barHeight = 26, gap = 10, colorFor }) {
  if (!data.length) return <div className="text-xs text-inksoft italic">No data yet.</div>
  const max = Math.max(...data.map((d) => d.value), 1)
  const labelW = 140
  const chartW = width - labelW - 50
  return (
    <svg viewBox={`0 0 ${width} ${data.length * (barHeight + gap)}`} width="100%">
      {data.map((d, i) => {
        const y = i * (barHeight + gap)
        const w = Math.max(2, (d.value / max) * chartW)
        return (
          <g key={d.label}>
            <text x={labelW - 8} y={y + barHeight / 2 + 4} textAnchor="end" fontSize="11" fill="#5B5F66">{d.label}</text>
            <rect x={labelW} y={y} width={chartW} height={barHeight} fill="#F2EFE7" rx="3" />
            <rect x={labelW} y={y} width={w} height={barHeight} fill={colorFor ? colorFor(d) : '#16253D'} rx="3" />
            <text x={labelW + w + 6} y={y + barHeight / 2 + 4} fontSize="11" fontWeight="600" fill="#16253D">{d.value}</text>
          </g>
        )
      })}
    </svg>
  )
}

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-white border border-line rounded-md p-4">
      <div className="text-[11px] text-inksoft uppercase tracking-wide font-semibold">{label}</div>
      <div className="text-2xl font-display font-bold text-navy mt-1">{value}</div>
      {sub && <div className="text-[11px] text-inksoft mt-1">{sub}</div>}
    </div>
  )
}

export default function PlatformDashboard() {
  const [tab, setTab] = useState('organizations')
  const [orgs, setOrgs] = useState([])
  const [billingSummary, setBillingSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([listAllOrganizations(), getBillingSummary()])
      .then(([o, b]) => { setOrgs(o); setBillingSummary(b) })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const TABS = [
    { key: 'organizations', label: 'Organizations' },
    { key: 'users', label: 'Users' },
    { key: 'admins', label: 'Platform Admins' },
  ]

  return (
    <div className="p-4 md:p-9">
      <h1 className="font-display text-xl font-semibold text-navy mb-1">Platform Dashboard</h1>
      <div className="text-xs text-inksoft mb-5">Platform Admin — cross-organization control. (Analytics has moved to the main Dashboard.)</div>

      {error && <div className="text-sm text-major bg-majorbg border border-major rounded p-3 mb-4">{error}</div>}

      {billingSummary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <StatCard label="Total Orgs" value={billingSummary.total_orgs} />
          <StatCard label="Trialing" value={billingSummary.trialing_count} />
          <StatCard label="Active" value={billingSummary.active_count} />
          <StatCard label="Past Due" value={billingSummary.past_due_count} />
          <StatCard label="Canceled" value={billingSummary.canceled_count} />
        </div>
      )}

      <div className="flex gap-2 mb-5 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`text-sm px-3 py-2 border-b-2 -mb-px font-medium ${tab === t.key ? 'border-navy text-navy' : 'border-transparent text-inksoft'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-sm text-inksoft">Loading…</div>
      ) : tab === 'organizations' ? (
        <OrganizationsTab orgs={orgs} onRefresh={() => listAllOrganizations().then(setOrgs)} />
      ) : tab === 'users' ? (
        <UsersTab orgs={orgs} />
      ) : (
        <AdminsTab />
      )}
    </div>
  )
}

// ==================== Organizations tab ====================

function OrganizationsTab({ orgs, onRefresh }) {
  const [expandedId, setExpandedId] = useState(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newOrgName, setNewOrgName] = useState('')
  const [newOrgPlan, setNewOrgPlan] = useState('starter')
  const [newOrgStatus, setNewOrgStatus] = useState('trialing')
  const [logoPreview, setLogoPreview] = useState(null)
  const [logoFile, setLogoFile] = useState(null)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    const reader = new FileReader()
    reader.onload = () => setLogoPreview(reader.result)
    reader.readAsDataURL(file)
  }

  const handleCreate = async () => {
    setCreateError('')
    setCreating(true)
    try {
      let logoUrl = null
      if (logoFile && logoPreview) {
        const path = `org-logos/${Date.now()}_${logoFile.name}`
        logoUrl = await uploadDataUrl('logos', path, logoPreview)
      }
      const newOrgId = await createOrganization(newOrgName, newOrgPlan, newOrgStatus, logoUrl)
      setNewOrgName('')
      setNewOrgPlan('starter')
      setNewOrgStatus('trialing')
      setLogoFile(null)
      setLogoPreview(null)
      setShowCreateForm(false)
      await onRefresh()
      setExpandedId(newOrgId) // jump straight to it so the first user can be added
    } catch (err) {
      setCreateError(err.message)
    }
    setCreating(false)
  }

  const inputCls = 'px-2.5 py-1.5 border border-line rounded text-xs'

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex justify-end">
        <button onClick={() => setShowCreateForm(!showCreateForm)} className="text-xs bg-navy text-white px-3 py-1.5 rounded">
          {showCreateForm ? 'Cancel' : '+ New Organization'}
        </button>
      </div>

      {showCreateForm && (
        <div className="bg-white border border-line rounded-md p-4">
          <div className="text-[11px] font-semibold text-navy2 uppercase tracking-wide mb-2">Create Organization</div>
          {createError && <div className="text-xs text-major bg-majorbg border border-major rounded p-2 mb-2">{createError}</div>}
          <div className="flex flex-col gap-2 max-w-sm">
            <input className={inputCls} placeholder="Organization name" value={newOrgName} onChange={(e) => setNewOrgName(e.target.value)} />
            <div className="flex gap-2">
              <select className={inputCls} value={newOrgPlan} onChange={(e) => setNewOrgPlan(e.target.value)}>
                <option value="starter">Starter</option>
                <option value="growth">Growth</option>
                <option value="pro">Pro</option>
              </select>
              <select className={inputCls} value={newOrgStatus} onChange={(e) => setNewOrgStatus(e.target.value)}>
                <option value="trialing">Trialing (14-day trial)</option>
                <option value="active">Active</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-navy2 uppercase mb-1">Logo (optional)</label>
              <div className="flex items-center gap-2">
                {logoPreview && <img src={logoPreview} alt="" className="h-8 w-8 object-contain border border-line rounded" />}
                <input type="file" accept="image/*" onChange={handleLogoChange} className="text-[10px]" />
              </div>
            </div>
            <button disabled={creating || !newOrgName.trim()} onClick={handleCreate} className="text-xs bg-navy text-white px-3 py-1.5 rounded disabled:opacity-50 self-start">
              {creating ? 'Creating…' : 'Create Organization'}
            </button>
            <div className="text-[10px] text-inksoft">You won't be added as a member — add the client's first user below once it's created.</div>
          </div>
        </div>
      )}

      {orgs.map((org) => (
        <div key={org.id} className="bg-white border border-line rounded-md overflow-hidden">
          <div
            onClick={() => setExpandedId(expandedId === org.id ? null : org.id)}
            className="px-4 py-3 flex justify-between items-center cursor-pointer"
          >
            <div>
              <div className="font-medium text-sm">{org.name}</div>
              <div className="text-[11px] text-inksoft mt-0.5">
                {org.subscription_status} • {org.plan_tier || 'no plan'} • {org.member_count} member{org.member_count === 1 ? '' : 's'}
              </div>
            </div>
            <div className="text-xs text-navy2">{expandedId === org.id ? '▲' : '▼'}</div>
          </div>
          {expandedId === org.id && <OrgDetailPanel org={org} onRefresh={onRefresh} />}
        </div>
      ))}
    </div>
  )
}

function OrgDetailPanel({ org, onRefresh }) {
  const [modules, setModules] = useState(org.enabled_modules || ['audits', 'flras', 'jsas'])
  const [planTier, setPlanTier] = useState(org.plan_tier || 'starter')
  const [subStatus, setSubStatus] = useState(org.subscription_status || 'trialing')
  const [billingInterval, setBillingInterval] = useState(org.billing_interval || 'monthly')
  const [suspendReason, setSuspendReason] = useState('')
  const [addEmail, setAddEmail] = useState('')
  const [addRole, setAddRole] = useState('member')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const runAction = async (fn) => {
    setBusy(true); setMsg('')
    try {
      await fn()
      onRefresh()
    } catch (err) {
      setMsg(`Error: ${err.message}`)
    }
    setBusy(false)
  }

  const handleAddUser = async () => {
    setBusy(true); setMsg('')
    try {
      await addExistingUserToOrg(addEmail, org.id, addRole)
      setMsg(`Added ${addEmail} to the organization.`)
      setAddEmail('')
      onRefresh()
    } catch (err) {
      if (err.message.includes('NO_ACCOUNT')) {
        try {
          await inviteUserByEmail(addEmail, org.id, addRole)
          setMsg(`No existing account — sent an invite email to ${addEmail}.`)
          setAddEmail('')
          onRefresh()
        } catch (inviteErr) {
          setMsg(`Error sending invite: ${inviteErr.message}`)
        }
      } else {
        setMsg(`Error: ${err.message}`)
      }
    }
    setBusy(false)
  }

  const toggleModule = (key) => {
    setModules((m) => (m.includes(key) ? m.filter((x) => x !== key) : [...m, key]))
  }

  const inputCls = 'px-2.5 py-1.5 border border-line rounded text-xs'

  return (
    <div className="border-t border-line px-4 py-4 bg-paper/40">
      {msg && <div className={`text-xs mb-3 px-2.5 py-1.5 rounded ${msg.startsWith('Error') ? 'bg-majorbg text-major' : 'bg-conformbg text-conform'}`}>{msg}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <div className="text-[11px] font-semibold text-navy2 uppercase tracking-wide mb-2">Enabled Modules</div>
          <div className="flex flex-wrap gap-2 mb-2">
            {MODULE_OPTIONS.map((m) => (
              <button key={m.key} onClick={() => toggleModule(m.key)}
                className={`text-xs px-2.5 py-1.5 rounded border ${modules.includes(m.key) ? 'bg-navy text-white border-navy' : 'border-line bg-white'}`}>
                {m.label}
              </button>
            ))}
          </div>
          <button disabled={busy} onClick={() => runAction(() => setOrgModules(org.id, modules))} className="text-xs bg-navy text-white px-3 py-1.5 rounded">
            Save Modules
          </button>

          <div className="text-[11px] font-semibold text-navy2 uppercase tracking-wide mt-5 mb-2">Suspension</div>
          {org.is_suspended ? (
            <div>
              <div className="text-xs text-major mb-2">Currently suspended {org.suspension_reason && `— ${org.suspension_reason}`}</div>
              <button disabled={busy} onClick={() => runAction(() => setOrgSuspended(org.id, false, null))} className="text-xs bg-conform text-white px-3 py-1.5 rounded">
                Reactivate
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input className={inputCls} placeholder="Reason (optional)" value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)} />
              <button disabled={busy} onClick={() => runAction(() => setOrgSuspended(org.id, true, suspendReason))} className="text-xs bg-major text-white px-3 py-1.5 rounded whitespace-nowrap">
                Suspend Org
              </button>
            </div>
          )}
        </div>

        <div>
          <div className="text-[11px] font-semibold text-navy2 uppercase tracking-wide mb-2">Billing</div>
          <div className="flex flex-col gap-2 mb-2">
            <select className={inputCls} value={planTier} onChange={(e) => setPlanTier(e.target.value)}>
              <option value="starter">Starter</option>
              <option value="growth">Growth</option>
              <option value="pro">Pro</option>
            </select>
            <select className={inputCls} value={subStatus} onChange={(e) => setSubStatus(e.target.value)}>
              <option value="trialing">Trialing</option>
              <option value="active">Active</option>
              <option value="past_due">Past Due</option>
              <option value="canceled">Canceled</option>
            </select>
            <select className={inputCls} value={billingInterval} onChange={(e) => setBillingInterval(e.target.value)}>
              <option value="monthly">Monthly</option>
              <option value="annual">Annual</option>
            </select>
          </div>
          <button disabled={busy} onClick={() => runAction(() => updateOrgBilling(org.id, planTier, subStatus, billingInterval))} className="text-xs bg-navy text-white px-3 py-1.5 rounded">
            Save Billing
          </button>

          <div className="text-[11px] font-semibold text-navy2 uppercase tracking-wide mt-5 mb-2">Add User</div>
          <div className="flex flex-col gap-2">
            <input className={inputCls} placeholder="Email address" value={addEmail} onChange={(e) => setAddEmail(e.target.value)} />
            <div className="flex gap-2">
              <select className={inputCls} value={addRole} onChange={(e) => setAddRole(e.target.value)}>
                <option value="member">User</option>
                <option value="admin">Organization Admin</option>
              </select>
              <button disabled={busy || !addEmail} onClick={handleAddUser} className="text-xs bg-navy text-white px-3 py-1.5 rounded disabled:opacity-50">
                Add / Invite
              </button>
            </div>
            <div className="text-[10px] text-inksoft">Existing account → added instantly. New email → sent a real invite email.</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ==================== Users tab ====================

const ROLE_OPTIONS = [
  { key: 'admin', label: 'Organization Admin' },
  { key: 'manager', label: 'Manager' },
  { key: 'member', label: 'Member' },
  { key: 'viewer', label: 'Viewer' },
]

function UsersTab({ orgs }) {
  const [orgId, setOrgId] = useState('')
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [busyUserId, setBusyUserId] = useState(null)

  const refresh = (id) => {
    if (!id) { setMembers([]); return }
    setLoading(true)
    supabase.rpc('platform_list_org_members', { target_org_id: id })
      .then(({ data, error }) => {
        if (error) throw error
        setMembers(data || [])
      })
      .catch((err) => setMsg(`Error: ${err.message}`))
      .finally(() => setLoading(false))
  }

  useEffect(() => { refresh(orgId) }, [orgId])

  const handleRoleChange = async (userId, newRole) => {
    setBusyUserId(userId)
    setMsg('')
    try {
      const { error } = await supabase.rpc('set_member_role', { target_user_id: userId, target_org_id: orgId, new_role: newRole })
      if (error) throw error
      refresh(orgId)
    } catch (err) {
      setMsg(`Error: ${err.message}`)
    }
    setBusyUserId(null)
  }

  const handleRemove = async (userId, email) => {
    if (!confirm(`Remove ${email} from this organization?`)) return
    setBusyUserId(userId)
    setMsg('')
    try {
      const { error } = await supabase.rpc('remove_org_member', { target_user_id: userId, target_org_id: orgId })
      if (error) throw error
      refresh(orgId)
    } catch (err) {
      setMsg(`Error: ${err.message}`)
    }
    setBusyUserId(null)
  }

  const setUserBan = async (userId, banned) => {
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData?.session?.access_token
    const res = await fetch('/api/platform-set-user-ban', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ userId, banned }),
    })
    const body = await res.json()
    if (!res.ok) throw new Error(body.error || 'Request failed')
  }

  const handleBlock = async (userId, email) => {
    if (!confirm(`Block ${email} from the entire platform? They won't be able to log in anywhere until unblocked.`)) return
    setBusyUserId(userId)
    setMsg('')
    try {
      await setUserBan(userId, true)
      refresh(orgId)
    } catch (err) {
      setMsg(`Error: ${err.message}`)
    }
    setBusyUserId(null)
  }

  const handleDeleteAccount = async (userId, email) => {
    if (!confirm(`Delete ${email}'s account? They will never be able to log in again. This can only be reversed by a Platform Admin unblocking them.`)) return
    setBusyUserId(userId)
    setMsg('')
    try {
      await setUserBan(userId, true)
      refresh(orgId)
    } catch (err) {
      setMsg(`Error: ${err.message}`)
    }
    setBusyUserId(null)
  }

  const handleUnblock = async (userId, email) => {
    setBusyUserId(userId)
    setMsg('')
    try {
      await setUserBan(userId, false)
      refresh(orgId)
    } catch (err) {
      setMsg(`Error: ${err.message}`)
    }
    setBusyUserId(null)
  }

  return (
    <div className="bg-white border border-line rounded-md p-4 md:p-5">
      <div className="text-[11px] font-semibold text-navy2 uppercase tracking-wide mb-2">Select Organization</div>
      <select className="px-2.5 py-1.5 border border-line rounded text-sm mb-4 max-w-sm w-full" value={orgId} onChange={(e) => setOrgId(e.target.value)}>
        <option value="">Choose an organization…</option>
        {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>

      {msg && <div className={`text-xs mb-3 px-2.5 py-1.5 rounded ${msg.startsWith('Error') ? 'bg-majorbg text-major' : 'bg-conformbg text-conform'}`}>{msg}</div>}

      {loading ? (
        <div className="text-xs text-inksoft">Loading…</div>
      ) : orgId && !members.length ? (
        <div className="text-xs text-inksoft italic">No members in this organization yet.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {members.map((m) => (
            <div key={m.user_id} className="flex flex-wrap justify-between items-center gap-2 border border-line rounded px-3 py-2">
              <div className="text-xs">
                <div className="font-medium flex items-center gap-1.5">
                  {m.email}
                  {m.is_blocked && <span className="text-[9.5px] font-semibold px-1.5 py-0.5 rounded-full bg-majorbg text-major">Blocked</span>}
                </div>
                <div className="text-inksoft text-[10.5px]">Joined {new Date(m.joined_at).toLocaleDateString()}</div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  className="px-2 py-1 border border-line rounded text-xs"
                  value={m.role}
                  disabled={busyUserId === m.user_id}
                  onChange={(e) => handleRoleChange(m.user_id, e.target.value)}
                >
                  {ROLE_OPTIONS.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
                </select>
                {m.is_blocked ? (
                  <button
                    disabled={busyUserId === m.user_id}
                    onClick={() => handleUnblock(m.user_id, m.email)}
                    className="text-[11px] text-conform border border-conform/40 px-2 py-1 rounded disabled:opacity-50"
                  >
                    Unblock
                  </button>
                ) : (
                  <>
                    <button
                      disabled={busyUserId === m.user_id}
                      onClick={() => handleBlock(m.user_id, m.email)}
                      className="text-[11px] text-major border border-major/40 px-2 py-1 rounded disabled:opacity-50"
                    >
                      Block
                    </button>
                    <button
                      disabled={busyUserId === m.user_id}
                      onClick={() => handleDeleteAccount(m.user_id, m.email)}
                      className="text-[11px] text-white bg-major px-2 py-1 rounded disabled:opacity-50"
                    >
                      Delete Account
                    </button>
                  </>
                )}
                <button
                  disabled={busyUserId === m.user_id}
                  onClick={() => handleRemove(m.user_id, m.email)}
                  className="text-[11px] text-major border border-major/40 px-2 py-1 rounded disabled:opacity-50"
                >
                  Remove from Org
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ==================== Platform Admins tab ====================

function AdminsTab() {
  const [admins, setAdmins] = useState([])
  const [newEmail, setNewEmail] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(true)

  const refresh = () => {
    setLoading(true)
    listPlatformAdmins().then(setAdmins).catch((err) => setMsg(`Error: ${err.message}`)).finally(() => setLoading(false))
  }
  useEffect(() => { refresh() }, [])

  const handleAdd = async () => {
    setMsg('')
    try {
      await addPlatformAdmin(newEmail)
      setNewEmail('')
      refresh()
    } catch (err) {
      setMsg(`Error: ${err.message}`)
    }
  }

  const handleRemove = async (userId) => {
    if (!confirm('Remove this Platform Admin? They will lose all admin access immediately.')) return
    setMsg('')
    try {
      await removePlatformAdmin(userId)
      refresh()
    } catch (err) {
      setMsg(`Error: ${err.message}`)
    }
  }

  return (
    <div className="bg-white border border-line rounded-md p-4 md:p-5 max-w-xl">
      <div className="text-[11px] font-semibold text-navy2 uppercase tracking-wide mb-2">Add Platform Admin</div>
      <div className="text-[10.5px] text-inksoft mb-2">They must already have an AuditPro account.</div>
      <div className="flex gap-2 mb-4">
        <input className="flex-1 px-2.5 py-1.5 border border-line rounded text-sm" placeholder="Email address" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
        <button disabled={!newEmail} onClick={handleAdd} className="text-xs bg-navy text-white px-3 py-1.5 rounded disabled:opacity-50">Add</button>
      </div>
      {msg && <div className={`text-xs mb-3 px-2.5 py-1.5 rounded ${msg.startsWith('Error') ? 'bg-majorbg text-major' : 'bg-conformbg text-conform'}`}>{msg}</div>}

      {loading ? <div className="text-xs text-inksoft">Loading…</div> : (
        <div className="flex flex-col gap-2">
          {admins.map((a) => (
            <div key={a.user_id} className="flex justify-between items-center border border-line rounded px-3 py-2">
              <div className="text-xs">{a.email}</div>
              <button onClick={() => handleRemove(a.user_id)} className="text-[11px] text-major border border-major/40 px-2 py-1 rounded">Remove</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

