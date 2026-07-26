import { useEffect, useState } from 'react'
import { listAudits, deleteAudit } from '../lib/auditRepo'
import { supabase } from '../lib/supabaseClient'

const STATUS_LABEL = { in_progress: 'In Progress', draft_issued: 'Draft Issued', final: 'Final' }
const STATUS_CLS = {
  in_progress: 'bg-nabg text-na',
  draft_issued: 'bg-minorbg text-minor',
  final: 'bg-conformbg text-conform',
}

export default function AuditList({ onOpen, onNew, onManageCompanies }) {
  const [audits, setAudits] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = async () => {
    setLoading(true)
    try {
      setAudits(await listAudits())
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  useEffect(() => {
    refresh()
  }, [])

  const handleDelete = async (id, e) => {
    e.stopPropagation()
    if (!confirm('Delete this audit permanently? This cannot be undone.')) return
    await deleteAudit(id)
    refresh()
  }

  return (
    <div className="min-h-screen bg-paper">
      <div className="bg-navy text-white px-8 py-5 flex justify-between items-center">
        <div>
          <div className="font-display text-xl font-bold">AuditPro</div>
          <div className="text-[10.5px] font-mono text-[#9FB0C9] uppercase tracking-wide mt-0.5">
            SentinelPro Consultants
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onManageCompanies}
            className="text-xs border border-white/30 px-3 py-1.5 rounded hover:bg-white/10"
          >
            Manage Companies
          </button>
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-xs border border-white/30 px-3 py-1.5 rounded hover:bg-white/10"
          >
            Sign out
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-8">
        <div className="flex justify-between items-center mb-5">
          <h1 className="font-display text-xl font-semibold text-navy">My Audits</h1>
          <button onClick={onNew} className="bg-navy text-white px-4 py-2 rounded text-sm font-medium">
            + New Audit
          </button>
        </div>

        {error && <div className="text-sm text-major bg-majorbg border border-major rounded p-3 mb-4">{error}</div>}
        {loading && <div className="text-sm text-inksoft">Loading…</div>}

        {!loading && audits.length === 0 && (
          <div className="bg-white border border-line rounded-md p-10 text-center text-inksoft text-sm">
            No audits yet. Click "+ New Audit" to start one.
          </div>
        )}

        <div className="flex flex-col gap-2.5">
          {audits.map((a) => (
            <div
              key={a.id}
              onClick={() => onOpen(a.id)}
              className="bg-white border border-line rounded-md px-5 py-4 flex justify-between items-center cursor-pointer hover:border-navy2"
            >
              <div>
                <div className="font-display font-semibold text-[15px]">{a.client_name || 'Untitled Audit'}</div>
                <div className="text-xs text-inksoft mt-0.5 font-mono">
                  {a.standard || 'ISO 45001:2018'} • {a.department || 'No department'} • {a.audit_type} • {a.start_date || 'No date'}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${STATUS_CLS[a.status]}`}>
                  {STATUS_LABEL[a.status] || a.status}
                </span>
                <button
                  onClick={() => onOpen(a.id)}
                  className="text-xs text-navy border border-navy/40 px-2.5 py-1 rounded hover:bg-paper"
                >
                  Open / Edit
                </button>
                <button
                  onClick={(e) => handleDelete(a.id, e)}
                  className="text-xs text-major border border-major/40 px-2.5 py-1 rounded hover:bg-majorbg"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
