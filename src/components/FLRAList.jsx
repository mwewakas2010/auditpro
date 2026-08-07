import { useEffect, useState } from 'react'
import { listFLRAs, deleteFLRA } from '../lib/flraRepo'
import HazardIcon from './HazardIcon.jsx'

const STATUS_LABEL = { in_progress: 'In Progress', final: 'Final' }
const STATUS_CLS = { in_progress: 'bg-nabg text-na', final: 'bg-conformbg text-conform' }

export default function FLRAList({ onOpen, onNew }) {
  const [flras, setFlras] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = async () => {
    setLoading(true)
    try {
      setFlras(await listFLRAs())
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  useEffect(() => { refresh() }, [])

  const handleDelete = async (id, e) => {
    e.stopPropagation()
    if (!confirm('Delete this Field Level Risk Assessment permanently? This cannot be undone.')) return
    await deleteFLRA(id)
    refresh()
  }

  return (
    <div className="p-4 md:p-9">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-3 mb-5">
        <h1 className="font-display text-xl font-semibold text-navy">Field Level Risk Assessments</h1>
        <button onClick={onNew} className="bg-navy text-white px-4 py-2 rounded text-sm font-medium">
          + New FLRA
        </button>
      </div>

      {error && <div className="text-sm text-major bg-majorbg border border-major rounded p-3 mb-4">{error}</div>}
      {loading && <div className="text-sm text-inksoft">Loading…</div>}

      {!loading && flras.length === 0 && (
        <div className="bg-white border border-line rounded-md p-10 text-center text-inksoft text-sm">
          No Field Level Risk Assessments yet. Click "+ New FLRA" to start one.
        </div>
      )}

      <div className="flex flex-col gap-2.5">
        {flras.map((f, index) => (
          <div
            key={f.id}
            onClick={() => onOpen(f.id)}
            className="bg-white border border-line rounded-md px-4 py-3 flex flex-col md:flex-row justify-between md:items-center gap-2.5 cursor-pointer hover:border-navy2"
          >
            <div className="flex items-start gap-3">
              <div className="font-mono text-xs text-inksoft bg-paper border border-line rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">
                {index + 1}
              </div>
              <div className="flex gap-1 flex-shrink-0 mt-0.5">
                {(f.fatal_risks || []).slice(0, 3).map((risk) => (
                  <div key={risk} className="w-7 h-7 rounded bg-navy/5 border border-line flex items-center justify-center">
                    <HazardIcon templateName={risk} size={20} className="text-navy" />
                  </div>
                ))}
              </div>
              <div>
                <div className="font-medium text-[14px]">
                  {f.employee_name || 'Unnamed'} {f.companies?.name && <span className="text-inksoft font-normal">— {f.companies.name}</span>}
                </div>
                <div className="text-xs text-inksoft mt-0.5">
                  {f.job_task_description ? f.job_task_description.slice(0, 60) : 'No task description'} •{' '}
                  <span className="font-mono">{new Date(f.created_at).toLocaleDateString()}</span> • {f.mode === 'group' ? 'Group' : 'Individual'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${STATUS_CLS[f.status]}`}>
                {STATUS_LABEL[f.status] || f.status}
              </span>
              <button onClick={(e) => { e.stopPropagation(); onOpen(f.id) }} className="text-xs text-navy border border-navy/40 px-2.5 py-1.5 rounded hover:bg-paper">
                Open / Edit
              </button>
              <button onClick={(e) => handleDelete(f.id, e)} className="text-xs text-major border border-major/40 px-2.5 py-1.5 rounded hover:bg-majorbg">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
