import { useEffect, useState } from 'react'
import { listCCVs, deleteCCV, listTemplates } from '../lib/ccvRepo'

const STATUS_LABEL = { in_progress: 'In Progress', final: 'Final' }
const STATUS_CLS = {
  in_progress: 'bg-nabg text-na',
  final: 'bg-conformbg text-conform',
}

export default function CCVList({ onOpen, onNew }) {
  const [ccvs, setCcvs] = useState([])
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showTemplatePicker, setShowTemplatePicker] = useState(false)

  const refresh = async () => {
    setLoading(true)
    try {
      const [ccvList, templateList] = await Promise.all([listCCVs(), listTemplates()])
      setCcvs(ccvList)
      setTemplates(templateList)
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
    if (!confirm('Delete this Critical Control Verification permanently? This cannot be undone.')) return
    await deleteCCV(id)
    refresh()
  }

  const handleNewClick = () => {
    if (templates.length === 1) {
      onNew(templates[0].id)
    } else {
      setShowTemplatePicker(true)
    }
  }

  return (
    <div className="p-4 md:p-9">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-3 mb-5">
        <h1 className="font-display text-xl font-semibold text-navy">Critical Controls Verification</h1>
        <button onClick={handleNewClick} className="bg-navy text-white px-4 py-2 rounded text-sm font-medium">
          + New CCV
        </button>
      </div>

      {showTemplatePicker && (
        <div className="bg-white border border-line rounded-md p-4 mb-4">
          <div className="text-sm font-semibold text-navy mb-2">Choose a checklist template</div>
          <div className="flex flex-col gap-2">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => onNew(t.id)}
                className="text-left px-3 py-2 border border-line rounded hover:border-navy2 text-sm"
              >
                {t.name} <span className="text-inksoft text-xs">({t.document_reference} Rev {t.revision_number})</span>
              </button>
            ))}
          </div>
          <button onClick={() => setShowTemplatePicker(false)} className="text-xs text-inksoft mt-3">
            Cancel
          </button>
        </div>
      )}

      {error && <div className="text-sm text-major bg-majorbg border border-major rounded p-3 mb-4">{error}</div>}
      {loading && <div className="text-sm text-inksoft">Loading…</div>}

      {!loading && ccvs.length === 0 && (
        <div className="bg-white border border-line rounded-md p-10 text-center text-inksoft text-sm">
          No Critical Control Verifications yet. Click "+ New CCV" to start one.
        </div>
      )}

      <div className="flex flex-col gap-2.5">
        {ccvs.map((c, index) => (
          <div
            key={c.id}
            onClick={() => onOpen(c.id)}
            className="bg-white border border-line rounded-md px-4 py-3 flex flex-col md:flex-row justify-between md:items-center gap-2.5 cursor-pointer hover:border-navy2"
          >
            <div className="flex items-start gap-3">
              <div className="font-mono text-xs text-inksoft bg-paper border border-line rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">
                {index + 1}
              </div>
              <div>
                <div className="font-medium text-[14px]">
                  {c.checklist_templates?.name || 'Untitled Template'}
                  {c.companies?.name && <span className="text-inksoft font-normal"> — {c.companies.name}</span>}
                </div>
                <div className="text-xs text-inksoft mt-0.5 font-mono">
                  {c.location || 'No location'} • {c.department || 'No department'} •{' '}
                  {c.date_time ? new Date(c.date_time).toLocaleString() : 'No date set'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${STATUS_CLS[c.status]}`}>
                {STATUS_LABEL[c.status] || c.status}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); onOpen(c.id) }}
                className="text-xs text-navy border border-navy/40 px-2.5 py-1.5 rounded hover:bg-paper"
              >
                Open / Edit
              </button>
              <button
                onClick={(e) => handleDelete(c.id, e)}
                className="text-xs text-major border border-major/40 px-2.5 py-1.5 rounded hover:bg-majorbg"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
