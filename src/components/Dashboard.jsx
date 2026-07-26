import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    ;(async () => {
      try {
        const { data: audits, error: aErr } = await supabase.from('audits').select('id, status')
        if (aErr) throw aErr
        const { data: companies, error: cErr } = await supabase.from('companies').select('id')
        if (cErr) throw cErr

        setStats({
          companies: companies?.length || 0,
          totalAudits: audits?.length || 0,
          final: audits?.filter((a) => a.status === 'final').length || 0,
          draftIssued: audits?.filter((a) => a.status === 'draft_issued').length || 0,
          inProgress: audits?.filter((a) => a.status === 'in_progress').length || 0,
        })
      } catch (err) {
        setError(err.message)
      }
      setLoading(false)
    })()
  }, [])

  return (
    <div className="p-9">
      <h2 className="font-display text-[19px] font-semibold text-navy mb-1">Dashboard</h2>
      <div className="text-[12.5px] text-inksoft mb-6">A quick overview across your whole practice.</div>

      {error && <div className="text-sm text-major bg-majorbg border border-major rounded p-3 mb-4">{error}</div>}
      {loading && <div className="text-sm text-inksoft">Loading…</div>}

      {stats && (
        <>
          <div className="grid grid-cols-4 gap-4">
            <StatCard n={stats.companies} label="Companies" />
            <StatCard n={stats.totalAudits} label="Total Audits" />
            <StatCard n={stats.final} label="Final Reports" color="text-conform" />
            <StatCard n={stats.inProgress + stats.draftIssued} label="In Progress / Draft" color="text-minor" />
          </div>
          <div className="text-[11px] text-inksoft italic mt-6">
            This is a first-cut overview. Conformance trends, recurring-issue patterns across clients, and other
            analytics are planned as the fuller dashboard build-out.
          </div>
        </>
      )}
    </div>
  )
}

function StatCard({ n, label, color = 'text-navy' }) {
  return (
    <div className="bg-white border border-line rounded-md p-5">
      <div className={`font-display text-3xl font-bold ${color}`}>{n}</div>
      <div className="text-[11px] uppercase tracking-wide text-inksoft mt-1">{label}</div>
    </div>
  )
}
