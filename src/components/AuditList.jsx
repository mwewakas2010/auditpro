import { useEffect, useMemo, useState } from 'react'
import { listAudits, deleteAudit, setAuditSortOrder } from '../lib/auditRepo'

const STATUS_LABEL = { in_progress: 'In Progress', draft_issued: 'Draft Issued', final: 'Final' }
const STATUS_CLS = {
  in_progress: 'bg-nabg text-na',
  draft_issued: 'bg-minorbg text-minor',
  final: 'bg-conformbg text-conform',
}

const SORT_MODES = [
  { key: 'created_desc', label: 'Newest created first' },
  { key: 'created_asc', label: 'Oldest created first' },
  { key: 'standard', label: 'Standard (A\u2013Z)' },
  { key: 'custom', label: 'Custom order (drag with \u2191\u2193)' },
]

function companyKey(a) {
  return a.company_id || '__unassigned__'
}
function companyLabel(a) {
  return a.companies?.name || a.client_name || 'Unassigned'
}

function groupAudits(audits, sortMode) {
  const byCompany = new Map()
  audits.forEach((a) => {
    const key = companyKey(a)
    if (!byCompany.has(key)) byCompany.set(key, { key, name: companyLabel(a), standards: new Map() })
    const company = byCompany.get(key)
    const std = a.standard || 'Unspecified'
    if (!company.standards.has(std)) company.standards.set(std, [])
    company.standards.get(std).push(a)
  })

  const mostRecent = (list) => Math.max(...list.map((a) => new Date(a.created_at || 0).getTime()))

  const companies = Array.from(byCompany.values())

  // Sort audits within each standard group
  companies.forEach((company) => {
    company.standards.forEach((list) => {
      list.sort((a, b) => {
        if (sortMode === 'custom') {
          const diff = (a.sort_order || 0) - (b.sort_order || 0)
          if (diff !== 0) return diff
          return new Date(b.created_at || 0) - new Date(a.created_at || 0)
        }
        if (sortMode === 'created_asc') return new Date(a.created_at || 0) - new Date(b.created_at || 0)
        // created_desc and standard both use newest-first as the tiebreak within a group
        return new Date(b.created_at || 0) - new Date(a.created_at || 0)
      })
    })
  })

  // Order standard groups within each company
  companies.forEach((company) => {
    company.standardEntries = Array.from(company.standards.entries()).sort(([stdA, listA], [stdB, listB]) => {
      if (sortMode === 'standard') return stdA.localeCompare(stdB)
      if (sortMode === 'created_asc') return mostRecent(listA) - mostRecent(listB)
      return mostRecent(listB) - mostRecent(listA)
    })
  })

  // Order companies
  companies.sort((a, b) => {
    if (sortMode === 'standard') return a.name.localeCompare(b.name)
    const aAll = a.standardEntries.flatMap(([, list]) => list)
    const bAll = b.standardEntries.flatMap(([, list]) => list)
    if (sortMode === 'created_asc') return mostRecent(aAll) - mostRecent(bAll)
    return mostRecent(bAll) - mostRecent(aAll)
  })

  return companies
}

export default function AuditList({ onOpen, onNew }) {
  const [audits, setAudits] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sortMode, setSortMode] = useState('created_desc')
  const [collapsed, setCollapsed] = useState(new Set())

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

  const grouped = useMemo(() => groupAudits(audits, sortMode), [audits, sortMode])

  const handleDelete = async (id, e) => {
    e.stopPropagation()
    if (!confirm('Delete this audit permanently? This cannot be undone.')) return
    await deleteAudit(id)
    refresh()
  }

  const toggleCollapsed = (key) => {
    const next = new Set(collapsed)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    setCollapsed(next)
  }

  const moveAudit = async (list, index, direction) => {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= list.length) return
    const a = list[index]
    const b = list[targetIndex]
    const aOrder = a.sort_order || 0
    const bOrder = b.sort_order || 0
    const newAOrder = aOrder === bOrder ? targetIndex : bOrder
    const newBOrder = aOrder === bOrder ? index : aOrder
    try {
      await setAuditSortOrder(a.id, newAOrder)
      await setAuditSortOrder(b.id, newBOrder)
      refresh()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="p-4 md:p-9">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-3 mb-5">
        <h1 className="font-display text-xl font-semibold text-navy">My Audits</h1>
        <div className="flex items-center gap-3">
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value)}
            className="flex-1 md:flex-none text-sm border border-line rounded px-2.5 py-1.5 bg-white"
          >
            {SORT_MODES.map((m) => (
              <option key={m.key} value={m.key}>{m.label}</option>
            ))}
          </select>
          <button onClick={onNew} className="bg-navy text-white px-4 py-2 rounded text-sm font-medium flex-shrink-0">
            + New Audit
          </button>
        </div>
      </div>

      {error && <div className="text-sm text-major bg-majorbg border border-major rounded p-3 mb-4">{error}</div>}
      {loading && <div className="text-sm text-inksoft">Loading…</div>}

      {!loading && audits.length === 0 && (
        <div className="bg-white border border-line rounded-md p-10 text-center text-inksoft text-sm">
          No audits yet. Click "+ New Audit" to start one.
        </div>
      )}

      <div className="flex flex-col gap-3">
        {grouped.map((company) => {
          const isCollapsed = collapsed.has(company.key)
          const totalCount = company.standardEntries.reduce((sum, [, list]) => sum + list.length, 0)
          return (
            <div key={company.key} className="bg-white border border-line rounded-md overflow-hidden">
              <div
                onClick={() => toggleCollapsed(company.key)}
                className="px-4 md:px-5 py-3 bg-paper flex justify-between items-center cursor-pointer border-b border-line"
              >
                <div className="font-display font-semibold text-[15px] text-navy">{company.name}</div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-inksoft">{totalCount} audit{totalCount === 1 ? '' : 's'}</span>
                  <span className="text-xs text-inksoft">{isCollapsed ? '▼' : '▲'}</span>
                </div>
              </div>

              {!isCollapsed && (
                <div className="px-4 md:px-5 py-3">
                  {company.standardEntries.map(([standard, list]) => (
                    <div key={standard} className="mb-4 last:mb-0">
                      <div className="text-[11px] font-semibold text-navy2 uppercase tracking-wide mb-1.5">
                        {standard}
                      </div>
                      <div className="flex flex-col gap-2">
                        {list.map((a, idx) => (
                          <div
                            key={a.id}
                            onClick={() => onOpen(a.id)}
                            className="border border-line rounded-md px-4 py-3 flex flex-col md:flex-row justify-between md:items-center gap-2.5 cursor-pointer hover:border-navy2"
                          >
                            <div>
                              <div className="font-medium text-[14px]">{a.department || 'No department'}</div>
                              <div className="text-xs text-inksoft mt-0.5 font-mono">
                                {a.audit_type} • {a.start_date || 'No date'} • Created{' '}
                                {a.created_at ? new Date(a.created_at).toLocaleDateString() : '—'}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${STATUS_CLS[a.status]}`}>
                                {STATUS_LABEL[a.status] || a.status}
                              </span>
                              {sortMode === 'custom' && (
                                <div className="flex flex-col" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    onClick={() => moveAudit(list, idx, -1)}
                                    disabled={idx === 0}
                                    className="text-xs leading-none px-1.5 py-1 disabled:opacity-20"
                                  >
                                    ▲
                                  </button>
                                  <button
                                    onClick={() => moveAudit(list, idx, 1)}
                                    disabled={idx === list.length - 1}
                                    className="text-xs leading-none px-1.5 py-1 disabled:opacity-20"
                                  >
                                    ▼
                                  </button>
                                </div>
                              )}
                              <button
                                onClick={(e) => { e.stopPropagation(); onOpen(a.id) }}
                                className="text-xs text-navy border border-navy/40 px-2.5 py-1.5 rounded hover:bg-paper"
                              >
                                Open / Edit
                              </button>
                              <button
                                onClick={(e) => handleDelete(a.id, e)}
                                className="text-xs text-major border border-major/40 px-2.5 py-1.5 rounded hover:bg-majorbg"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
