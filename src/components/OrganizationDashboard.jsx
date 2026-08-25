import { useEffect, useState } from 'react'
import {
  getSafetyCultureScore, getSafetyCultureByDepartment, getCcvScheduleSummary,
  getCcvByFatalRisk, getFlraFatalRiskFrequency, getFatalRiskFrequency,
  getCcvLeaderboard, getFlraLeaderboard, getNotConducting,
  listCCVSchedule, scheduleCCV,
  getModuleCountsByDepartment, getJSARiskByDepartment, getFatalRiskByDepartment,
  getNcSummary, getNcList, resolveNonconformity, listAuditsForOrg, createNonconformity,
  getUnifiedActions, resolveFlraControl, resolveCcvAction, resolveJsaAction,
} from '../lib/analyticsRepo'
import { listTemplates } from '../lib/ccvRepo'

const CULTURE_COMPONENTS = [
  { key: 'hazard_closure_score', label: 'Hazard Closure', weight: 0.15, color: '#2F6E4E' },
  { key: 'near_miss_closure_score', label: 'Near Miss Closure', weight: 0.15, color: '#4C8C6B' },
  { key: 'hierarchy_quality_score', label: 'Control Quality', weight: 0.20, color: '#16253D' },
  { key: 'risk_reduction_score', label: 'Risk Reduction', weight: 0.20, color: '#B8862B' },
  { key: 'daily_review_score', label: 'Daily Reviews', weight: 0.15, color: '#6B4C9A' },
  { key: 'ccv_compliance_score', label: 'CCV Compliance', weight: 0.15, color: '#2C6E8F' },
]

function GaugeChart({ culture, size = 280, showTicks = true }) {
  const score = culture?.overall_score != null ? Number(culture.overall_score) : null
  const cx = size / 2
  const cy = size / 2 + 6
  const radius = size / 2 - 30
  const strokeW = Math.max(10, size * 0.093)

  const polar = (angleDeg, r) => {
    const rad = (angleDeg * Math.PI) / 180
    return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) }
  }
  const arcPath = (a1, a2, r) => {
    const p1 = polar(a1, r)
    const p2 = polar(a2, r)
    return `M ${p1.x} ${p1.y} A ${r} ${r} 0 0 1 ${p2.x} ${p2.y}`
  }
  const scoreAngle = (s) => 180 - (Math.max(0, Math.min(100, s)) / 100) * 180

  const hasScore = score != null
  const clamped = hasScore ? Math.max(0, Math.min(100, score)) : 0
  const needleAngle = scoreAngle(clamped)
  const needleEnd = polar(needleAngle, radius - 14)

  const zoneLabel = clamped < 40 ? 'Needs Attention' : clamped < 70 ? 'Developing' : 'Strong'
  const zoneColor = clamped < 40 ? '#A83A2C' : clamped < 70 ? '#C08A1E' : '#2F6E4E'

  const availableComponents = culture ? CULTURE_COMPONENTS.filter((c) => culture[c.key] != null) : []
  const pad = 24

  return (
    <div className="flex flex-col items-center flex-shrink-0" style={{ width: size + pad * 2 }}>
      <svg viewBox={`-${pad} 0 ${size + pad * 2} ${cy + 34}`} width="100%" style={{ maxWidth: size + pad * 2 }}>
        <path d={arcPath(180, 120, radius)} stroke="#A83A2C" strokeWidth={strokeW} fill="none" strokeLinecap="round" />
        <path d={arcPath(120, 60, radius)} stroke="#C08A1E" strokeWidth={strokeW} fill="none" />
        <path d={arcPath(60, 0, radius)} stroke="#2F6E4E" strokeWidth={strokeW} fill="none" strokeLinecap="round" />

        {showTicks && [0, 20, 40, 60, 80, 100].map((pct) => {
          const angle = scoreAngle(pct)
          const inner = polar(angle, radius + strokeW / 2 + 4)
          const outer = polar(angle, radius + strokeW / 2 + 10)
          const label = polar(angle, radius + strokeW / 2 + 21)
          return (
            <g key={pct}>
              <line x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke="#8A8368" strokeWidth="1.5" />
              <text x={label.x} y={label.y + 3} textAnchor="middle" fontSize={size < 180 ? 7 : 9} fontWeight="600" fill="#5B5F66">{pct}%</text>
            </g>
          )
        })}

        {availableComponents.map((c) => {
          const angle = scoreAngle(Number(culture[c.key]))
          const inner = polar(angle, radius - strokeW / 2 - 4)
          const outer = polar(angle, radius + strokeW / 2 + 4)
          return <line key={c.key} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke={c.color} strokeWidth="3" strokeLinecap="round" />
        })}

        {hasScore && (
          <>
            <line x1={cx} y1={cy} x2={needleEnd.x} y2={needleEnd.y} stroke="#16253D" strokeWidth="4" strokeLinecap="round" />
            <circle cx={cx} cy={cy} r="8" fill="#16253D" />
          </>
        )}
        <text x={cx} y={cy + (size < 180 ? 22 : 26)} textAnchor="middle" fontSize={size < 180 ? 20 : 32} fontWeight="700" fill="#16253D">
          {hasScore ? Math.round(score) : '—'}
        </text>
      </svg>
      {hasScore && <div className={`${size < 180 ? 'text-[11px]' : 'text-sm'} font-semibold -mt-1`} style={{ color: zoneColor }}>{zoneLabel}</div>}
      {!hasScore && <div className="text-xs text-inksoft italic -mt-1">Not enough data yet</div>}
    </div>
  )
}

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-white border border-line rounded-md p-3">
      <div className="text-[10px] text-inksoft uppercase tracking-wide font-semibold">{label}</div>
      <div className="text-xl font-display font-bold text-navy mt-0.5">{value}</div>
      {sub && <div className="text-[10px] text-inksoft mt-0.5">{sub}</div>}
    </div>
  )
}

function StatusBadge({ status }) {
  const style = {
    closed: { bg: '#DCEDE3', text: '#2F6E4E', label: 'Closed' },
    overdue: { bg: '#F3CFC7', text: '#A83A2C', label: 'Overdue' },
    pending: { bg: '#F7EAC9', text: '#96690F', label: 'Pending' },
  }[status] || { bg: '#F2EFE7', text: '#5B5F66', label: status }
  return (
    <span className="text-[9.5px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap" style={{ background: style.bg, color: style.text }}>
      {style.label}
    </span>
  )
}

function VerticalBarChart({ data, height = 140, color = '#16253D' }) {
  if (!data.length) return <div className="text-xs text-inksoft italic">No data yet.</div>
  const max = Math.max(...data.map((d) => d.value), 1)
  const barW = 34
  const gap = 14
  const width = data.length * (barW + gap)
  return (
    <svg viewBox={`0 0 ${Math.max(width, 100)} ${height + 26}`} width="100%" style={{ maxWidth: width + 20 }}>
      {data.map((d, i) => {
        const x = i * (barW + gap)
        const h = Math.max(2, (d.value / max) * height)
        return (
          <g key={d.label}>
            <rect x={x} y={height - h} width={barW} height={h} fill={color} rx="3" />
            <text x={x + barW / 2} y={height - h - 5} textAnchor="middle" fontSize="10.5" fontWeight="600" fill="#16253D">{d.value}</text>
            <text x={x + barW / 2} y={height + 13} textAnchor="middle" fontSize="9" fill="#5B5F66">{d.label.length > 9 ? d.label.slice(0, 8) + '…' : d.label}</text>
          </g>
        )
      })}
    </svg>
  )
}

function StackedVerticalBarChart({ data, height = 160, seriesA = 'a', seriesB = 'b', colorA = '#16253D', colorB = '#B8862B', labelA = 'A', labelB = 'B' }) {
  if (!data.length) return <div className="text-xs text-inksoft italic">No data yet.</div>
  const totals = data.map((d) => Number(d[seriesA]) + Number(d[seriesB]))
  const max = Math.max(...totals, 1)
  const barW = 34
  const gap = 14
  const width = data.length * (barW + gap)
  const MIN_TEXT_H = 14

  return (
    <div>
      <svg viewBox={`0 0 ${Math.max(width, 100)} ${height + 26}`} width="100%" style={{ maxWidth: width + 20 }}>
        {data.map((d, i) => {
          const x = i * (barW + gap)
          const aVal = Number(d[seriesA])
          const bVal = Number(d[seriesB])
          const aH = Math.max(aVal > 0 ? 2 : 0, (aVal / max) * height)
          const bH = Math.max(bVal > 0 ? 2 : 0, (bVal / max) * height)
          const total = aVal + bVal
          return (
            <g key={d.label}>
              <rect x={x} y={height - aH - bH} width={barW} height={bH} fill={colorB} rx="2">
                <title>{`${d.label} — ${labelB}: ${bVal}`}</title>
              </rect>
              {bH >= MIN_TEXT_H && (
                <text x={x + barW / 2} y={height - aH - bH / 2 + 3.5} textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#FFFFFF">{bVal}</text>
              )}
              <rect x={x} y={height - aH} width={barW} height={aH} fill={colorA} rx="2">
                <title>{`${d.label} — ${labelA}: ${aVal}`}</title>
              </rect>
              {aH >= MIN_TEXT_H && (
                <text x={x + barW / 2} y={height - aH / 2 + 3.5} textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#FFFFFF">{aVal}</text>
              )}
              <text x={x + barW / 2} y={height - aH - bH - 5} textAnchor="middle" fontSize="10" fontWeight="600" fill="#16253D">{total > 0 ? total : ''}</text>
              <text x={x + barW / 2} y={height + 13} textAnchor="middle" fontSize="9" fill="#5B5F66">{d.label.length > 9 ? d.label.slice(0, 8) + '…' : d.label}</text>
            </g>
          )
        })}
      </svg>
      <div className="flex items-center gap-3 mt-1 text-[10px] text-inksoft">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: colorA }} /> {labelA}</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: colorB }} /> {labelB}</span>
      </div>
    </div>
  )
}

function CCVSchedulePanel({ organizationId, onScheduled }) {
  const [templates, setTemplates] = useState([])
  const [items, setItems] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [templateId, setTemplateId] = useState('')
  const [plannedDate, setPlannedDate] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [assignedSection, setAssignedSection] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const refresh = () => {
    listCCVSchedule(organizationId).then(setItems).catch(() => {})
  }

  useEffect(() => {
    listTemplates().then(setTemplates).catch(() => {})
    refresh()
  }, [organizationId])

  const handleSchedule = async () => {
    setError('')
    setSaving(true)
    try {
      await scheduleCCV(templateId, plannedDate, organizationId, null, assignedTo || null, assignedSection || null)
      setTemplateId(''); setPlannedDate(''); setAssignedTo(''); setAssignedSection('')
      setShowForm(false)
      refresh()
      onScheduled && onScheduled()
    } catch (err) {
      setError(err.message)
    }
    setSaving(false)
  }

  const inputCls = 'px-2.5 py-1.5 border border-line rounded text-xs'

  return (
    <div className="bg-white border border-line rounded-md p-3 mb-3">
      <div className="flex justify-between items-center mb-2">
        <div className="font-display text-[13px] font-semibold text-navy">CCV Schedule</div>
        <button onClick={() => setShowForm(!showForm)} className="text-[10.5px] text-navy border border-navy/40 px-2 py-1 rounded">
          {showForm ? 'Cancel' : '+ Schedule CCV'}
        </button>
      </div>

      {showForm && (
        <div className="border border-line rounded p-2.5 mb-3 bg-paper/40">
          {error && <div className="text-[10.5px] text-major bg-majorbg border border-major rounded p-1.5 mb-2">{error}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
            <select className={inputCls} value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
              <option value="">Select hazard category…</option>
              {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <input type="date" className={inputCls} value={plannedDate} onChange={(e) => setPlannedDate(e.target.value)} />
            <input className={inputCls} placeholder="Assigned to (optional)" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} />
            <input className={inputCls} placeholder="Section (optional)" value={assignedSection} onChange={(e) => setAssignedSection(e.target.value)} />
          </div>
          <button disabled={saving || !templateId || !plannedDate} onClick={handleSchedule} className="text-[11px] bg-navy text-white px-3 py-1.5 rounded disabled:opacity-50">
            {saving ? 'Scheduling…' : 'Schedule'}
          </button>
        </div>
      )}

      <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto">
        {items.map((item) => {
          const status = item.linked_ccv_instance_id ? 'conducted' : item.is_overdue ? 'overdue' : 'upcoming'
          const style = { conducted: { bg: '#DCEDE3', text: '#2F6E4E' }, overdue: { bg: '#F3CFC7', text: '#A83A2C' }, upcoming: { bg: '#F7EAC9', text: '#96690F' } }[status]
          return (
            <div key={item.id} className="flex justify-between items-center text-[11px] border border-line rounded p-1.5">
              <div>
                <span className="font-medium">{item.template_name}</span>
                <span className="text-inksoft"> • {item.planned_date}{item.assigned_to && ` • ${item.assigned_to}`}{item.assigned_section && ` • ${item.assigned_section}`}</span>
              </div>
              <span className="text-[9.5px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: style.bg, color: style.text }}>
                {status === 'conducted' ? 'Conducted' : status === 'overdue' ? 'Overdue' : 'Upcoming'}
              </span>
            </div>
          )
        })}
        {!items.length && <div className="text-xs text-inksoft italic">Nothing scheduled yet.</div>}
      </div>
    </div>
  )
}

function LeaderboardList({ people, emptyLabel }) {
  if (!people.length) return <div className="text-xs text-inksoft italic">{emptyLabel}</div>
  return (
    <div className="flex flex-col gap-1.5">
      {people.map((p, i) => (
        <div key={p.user_id} className="flex items-center gap-2 text-[11px]">
          <span className="w-5 text-inksoft font-semibold">{i + 1}.</span>
          <span className="flex-1 truncate">{p.email}</span>
          <span className="font-semibold text-navy">{p.count}</span>
        </div>
      ))}
    </div>
  )
}

function ComponentBreakdownList({ culture }) {
  const available = culture ? CULTURE_COMPONENTS.filter((c) => culture[c.key] != null) : []
  if (!available.length) return null
  return (
    <div className="flex flex-col gap-2 w-full">
      {available.map((c) => {
        const val = Number(culture[c.key])
        return (
          <div key={c.key} className="flex items-center gap-2">
            <div className="w-[110px] flex-shrink-0 text-[10.5px] text-inksoft truncate">{c.label}</div>
            <div className="flex-1 h-2.5 rounded-full bg-[#F2EFE7] overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${val}%`, background: c.color }} />
            </div>
            <div className="w-9 flex-shrink-0 text-right text-[10.5px] font-semibold text-navy">{Math.round(val)}</div>
            <div className="w-9 flex-shrink-0 text-right text-[9px] text-inksoft">{Math.round(c.weight * 100)}%</div>
          </div>
        )
      })}
    </div>
  )
}

function NonConformitiesPanel({ organizationId }) {
  const [summary, setSummary] = useState(null)
  const [items, setItems] = useState([])
  const [audits, setAudits] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [auditId, setAuditId] = useState('')
  const [description, setDescription] = useState('')
  const [responsiblePerson, setResponsiblePerson] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const refresh = () => {
    getNcSummary(organizationId).then(setSummary).catch(() => {})
    getNcList(organizationId, true).then(setItems).catch(() => {})
  }

  useEffect(() => {
    listAuditsForOrg(organizationId).then(setAudits).catch(() => {})
    refresh()
  }, [organizationId])

  const handleCreate = async () => {
    setError('')
    setSaving(true)
    try {
      await createNonconformity(auditId, description, responsiblePerson || null, dueDate || null)
      setAuditId(''); setDescription(''); setResponsiblePerson(''); setDueDate('')
      setShowForm(false)
      refresh()
    } catch (err) {
      setError(err.message)
    }
    setSaving(false)
  }

  const handleResolve = async (ncId) => {
    await resolveNonconformity(ncId)
    refresh()
  }

  const inputCls = 'px-2.5 py-1.5 border border-line rounded text-xs'

  return (
    <div className="bg-white border border-line rounded-md p-3 mb-3">
      <div className="flex justify-between items-center mb-2">
        <div className="font-display text-[13px] font-semibold text-navy">Non-Conformities</div>
        <button onClick={() => setShowForm(!showForm)} className="text-[10.5px] text-navy border border-navy/40 px-2 py-1 rounded">
          {showForm ? 'Cancel' : '+ Add Non-Conformity'}
        </button>
      </div>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3">
          <StatCard label="Total" value={summary.total_count ?? '—'} />
          <StatCard label="Closed" value={summary.closed_count ?? '—'} />
          <StatCard label="Pending" value={summary.pending_count ?? '—'} />
          <StatCard label="Due Soon" value={summary.upcoming_count ?? '—'} />
          <StatCard label="Overdue" value={summary.overdue_count ?? '—'} />
        </div>
      )}

      {showForm && (
        <div className="border border-line rounded p-2.5 mb-3 bg-paper/40">
          {error && <div className="text-[10.5px] text-major bg-majorbg border border-major rounded p-1.5 mb-2">{error}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
            <select className={`${inputCls} sm:col-span-2`} value={auditId} onChange={(e) => setAuditId(e.target.value)}>
              <option value="">Select audit…</option>
              {audits.map((a) => <option key={a.id} value={a.id}>{a.name} — {new Date(a.created_at).toLocaleDateString()}</option>)}
            </select>
            <textarea className={`${inputCls} sm:col-span-2`} rows={2} placeholder="Non-conformity description" value={description} onChange={(e) => setDescription(e.target.value)} />
            <input className={inputCls} placeholder="Responsible person (optional)" value={responsiblePerson} onChange={(e) => setResponsiblePerson(e.target.value)} />
            <input type="date" className={inputCls} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <button disabled={saving || !auditId || !description.trim()} onClick={handleCreate} className="text-[11px] bg-navy text-white px-3 py-1.5 rounded disabled:opacity-50">
            {saving ? 'Saving…' : 'Add Non-Conformity'}
          </button>
        </div>
      )}

      <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto">
        {items.map((nc) => {
          const status = nc.closed ? 'closed' : (nc.due_date && nc.due_date < new Date().toISOString().slice(0, 10) ? 'overdue' : 'pending')
          const style = { closed: { bg: '#DCEDE3', text: '#2F6E4E' }, overdue: { bg: '#F3CFC7', text: '#A83A2C' }, pending: { bg: '#F7EAC9', text: '#96690F' } }[status]
          return (
            <div key={nc.id} className="text-[11px] border border-line rounded p-1.5 flex justify-between items-start gap-2">
              <div>
                <div className="font-medium">{nc.description}</div>
                <div className="text-inksoft mt-0.5">
                  {nc.responsible_person && `${nc.responsible_person} • `}
                  {nc.due_date ? `Due ${nc.due_date}` : 'No due date set'}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className="text-[9.5px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: style.bg, color: style.text }}>
                  {status === 'closed' ? 'Closed' : status === 'overdue' ? 'Overdue' : 'Pending'}
                </span>
                <button onClick={() => handleResolve(nc.id)} className="text-[10px] text-conform border border-conform/40 px-1.5 py-0.5 rounded whitespace-nowrap">Close</button>
              </div>
            </div>
          )
        })}
        {!items.length && <div className="text-xs text-inksoft italic">No open non-conformities.</div>}
      </div>
    </div>
  )
}

export default function OrganizationDashboard({ organizationId, organizationName, onBack, backLabel = '← Back to Platform Dashboard' }) {
  const [orgCulture, setOrgCulture] = useState(null)
  const [deptCulture, setDeptCulture] = useState([])
  const [ccvSchedule, setCcvSchedule] = useState(null)
  const [ccvByFatalRisk, setCcvByFatalRisk] = useState([])
  const [flraFatalRisk, setFlraFatalRisk] = useState([])
  const [combinedFatalRisk, setCombinedFatalRisk] = useState([])
  const [ccvLeaderboard, setCcvLeaderboard] = useState([])
  const [flraLeaderboard, setFlraLeaderboard] = useState([])
  const [notConducting, setNotConducting] = useState([])
  const [deptModuleCounts, setDeptModuleCounts] = useState([])
  const [deptJsaRisk, setDeptJsaRisk] = useState([])
  const [deptFatalRisk, setDeptFatalRisk] = useState([])
  const [orgActions, setOrgActions] = useState([])
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    Promise.all([
      getSafetyCultureScore('platform', organizationId, 90),
      getSafetyCultureByDepartment(organizationId, 90),
      getCcvScheduleSummary(organizationId),
      getCcvByFatalRisk(organizationId, dateFrom || null, dateTo || null),
      getFlraFatalRiskFrequency(organizationId, dateFrom || null, dateTo || null),
      getFatalRiskFrequency('platform', organizationId, dateFrom || null, dateTo || null),
      getCcvLeaderboard(organizationId, dateFrom || null, dateTo || null),
      getFlraLeaderboard(organizationId, dateFrom || null, dateTo || null),
      getNotConducting(organizationId, 90),
      getModuleCountsByDepartment(organizationId),
      getJSARiskByDepartment(organizationId),
      getFatalRiskByDepartment(organizationId),
      getUnifiedActions('platform', organizationId, false),
    ])
      .then(([org, depts, sched, ccvFr, flraFr, combinedFr, ccvLb, flraLb, notCond, dmc, djr, dfr, actions]) => {
        setOrgCulture(org); setDeptCulture(depts); setCcvSchedule(sched)
        setCcvByFatalRisk(ccvFr); setFlraFatalRisk(flraFr); setCombinedFatalRisk(combinedFr)
        setCcvLeaderboard(ccvLb); setFlraLeaderboard(flraLb); setNotConducting(notCond)
        setDeptModuleCounts(dmc); setDeptJsaRisk(djr); setDeptFatalRisk(dfr)
        setOrgActions(actions)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [organizationId, dateFrom, dateTo])

  const refreshScheduleSummary = () => {
    getCcvScheduleSummary(organizationId).then(setCcvSchedule).catch(() => {})
  }

  const refreshActions = () => {
    getUnifiedActions('platform', organizationId, false).then(setOrgActions).catch(() => {})
  }

  const actionStatusCounts = {
    pending: orgActions.filter((a) => a.status === 'pending').length,
    overdue: orgActions.filter((a) => a.status === 'overdue').length,
    closed: orgActions.filter((a) => a.status === 'closed').length,
  }

  return (
    <div className="p-4 md:p-7">
      {onBack && (
        <button onClick={onBack} className="text-xs text-navy2 mb-3 flex items-center gap-1">
          {backLabel}
        </button>
      )}

      <h1 className="font-display text-xl font-semibold text-navy mb-1">{organizationName || 'Organization'} — Dashboard</h1>
      <div className="text-[11px] text-inksoft mb-3">Safety culture, leading indicators, and action tracking for this organization.</div>

      <div className="flex flex-wrap gap-2 mb-5 items-end">
        <label className="text-[10px] text-inksoft">Filter fatal risk charts & leaderboards</label>
        <input type="date" className="px-2 py-1 border border-line rounded text-[11px]" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        <span className="text-[11px] text-inksoft">to</span>
        <input type="date" className="px-2 py-1 border border-line rounded text-[11px]" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
      </div>

      {error && <div className="text-sm text-major bg-majorbg border border-major rounded p-2.5 mb-3">{error}</div>}
      {loading && <div className="text-sm text-inksoft mb-3">Loading…</div>}

      <div className="bg-white border border-line rounded-md p-5 mb-4 max-w-3xl">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <GaugeChart culture={orgCulture} size={280} />
          <div className="flex-1 w-full pt-1">
            <div className="font-display text-base font-bold text-navy mb-1">Organization Safety Culture Score</div>
            <div className="text-[11px] text-inksoft mb-3">Fixed 90-day window, consolidated across every department in this organization.</div>
            <ComponentBreakdownList culture={orgCulture} />
          </div>
        </div>
      </div>

      {deptCulture.length > 0 && (
        <div className="bg-white border border-line rounded-md p-4 mb-4">
          <div className="font-display text-sm font-semibold text-navy mb-1">Safety Culture by Department</div>
          <div className="text-[10.5px] text-inksoft mb-3">Same composite score, broken out per department within this organization.</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {deptCulture.map((d) => (
              <div key={d.department} className="border border-line rounded-md p-2.5 flex flex-col items-center">
                <div className="text-[11px] font-medium text-navy text-center mb-1 truncate w-full">{d.department}</div>
                <GaugeChart culture={d} size={130} showTicks={false} />
              </div>
            ))}
          </div>

          {deptModuleCounts.length > 0 && (
            <>
              <div className="border-t border-line mt-4 pt-4">
                <div className="text-[10.5px] text-inksoft mb-3">JSA uses Plant/Area, FLRA uses Department/Area. CCV isn't clustered here yet — per-department CCV breakdown hasn't been built into this view.</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <div>
                    <div className="font-display text-[13px] font-semibold text-navy mb-2">Records by Department</div>
                    <StackedVerticalBarChart
                      data={[...new Set(deptModuleCounts.map((r) => r.department))].map((dept) => ({
                        label: dept,
                        jsa: Number(deptModuleCounts.find((r) => r.department === dept && r.module === 'jsa')?.count || 0),
                        flra: Number(deptModuleCounts.find((r) => r.department === dept && r.module === 'flra')?.count || 0),
                      }))}
                      seriesA="jsa" seriesB="flra" labelA="JSA" labelB="FLRA" colorA="#16253D" colorB="#B8862B"
                    />
                  </div>
                  <div>
                    <div className="font-display text-[13px] font-semibold text-navy mb-1">JSA Risk Reduction by Department</div>
                    <div className="text-[10px] text-inksoft mb-2">Average raw vs. residual risk score per department.</div>
                    <table className="w-full text-[10.5px]">
                      <thead>
                        <tr className="border-b border-line">
                          <th className="text-left py-1 font-semibold text-navy2">Department</th>
                          <th className="text-center py-1 font-semibold text-navy2">Raw</th>
                          <th className="text-center py-1 font-semibold text-navy2">Residual</th>
                          <th className="text-center py-1 font-semibold text-navy2">Steps</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deptJsaRisk.map((r) => (
                          <tr key={r.department} className="border-b border-line last:border-0">
                            <td className="py-1.5">{r.department}</td>
                            <td className="text-center py-1.5">{r.avg_raw_score != null ? Number(r.avg_raw_score).toFixed(1) : '—'}</td>
                            <td className="text-center py-1.5">{r.avg_residual_score != null ? Number(r.avg_residual_score).toFixed(1) : '—'}</td>
                            <td className="text-center py-1.5">{r.step_count}</td>
                          </tr>
                        ))}
                        {!deptJsaRisk.length && <tr><td colSpan={4} className="text-inksoft italic py-2">No scored JSA steps yet.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="font-display text-[13px] font-semibold text-navy mb-2">Fatal Risk Frequency by Department</div>
                <table className="w-full text-[10.5px]">
                  <thead>
                    <tr className="border-b border-line">
                      <th className="text-left py-1 font-semibold text-navy2">Department</th>
                      <th className="text-left py-1 font-semibold text-navy2">Fatal Risk</th>
                      <th className="text-center py-1 font-semibold text-navy2">JSA</th>
                      <th className="text-center py-1 font-semibold text-navy2">FLRA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deptFatalRisk.filter((r) => Number(r.jsa_count) + Number(r.flra_count) > 0).map((r, i) => (
                      <tr key={i} className="border-b border-line last:border-0">
                        <td className="py-1.5">{r.department}</td>
                        <td className="py-1.5">{r.fatal_risk}</td>
                        <td className="text-center py-1.5">{r.jsa_count}</td>
                        <td className="text-center py-1.5">{r.flra_count}</td>
                      </tr>
                    ))}
                    {!deptFatalRisk.filter((r) => Number(r.jsa_count) + Number(r.flra_count) > 0).length && (
                      <tr><td colSpan={4} className="text-inksoft italic py-2">No fatal risks recorded yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ============ Leading Indicators ============ */}
      <div className="border-l-4 pl-3 mb-3 mt-6" style={{ borderColor: '#2F6E4E' }}>
        <h2 className="font-display text-base font-bold text-navy">Leading Indicators</h2>
      </div>

      <CCVSchedulePanel organizationId={organizationId} onScheduled={refreshScheduleSummary} />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5 mb-3">
        <StatCard label="CCVs Planned" value={ccvSchedule?.planned_count ?? '—'} />
        <StatCard label="Conducted" value={ccvSchedule?.conducted_count ?? '—'} />
        <StatCard label="Upcoming" value={ccvSchedule?.upcoming_count ?? '—'} />
        <StatCard label="Overdue" value={ccvSchedule?.overdue_count ?? '—'} />
        <StatCard label="% Completed" value={ccvSchedule?.completion_pct != null ? `${ccvSchedule.completion_pct}%` : '—'} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
        <div className="bg-white border border-line rounded-md p-3">
          <div className="font-display text-[13px] font-semibold text-navy mb-2">CCVs by Fatal Risk Category</div>
          <VerticalBarChart data={ccvByFatalRisk.map((r) => ({ label: r.fatal_risk, value: Number(r.count) }))} color="#16253D" />
        </div>
        <div className="bg-white border border-line rounded-md p-3">
          <div className="font-display text-[13px] font-semibold text-navy mb-2">Fatal Risks — FLRA Only</div>
          <VerticalBarChart data={flraFatalRisk.map((r) => ({ label: r.fatal_risk, value: Number(r.count) }))} color="#B8862B" />
        </div>
        <div className="bg-white border border-line rounded-md p-3">
          <div className="font-display text-[13px] font-semibold text-navy mb-2">Fatal Risks — JSA + FLRA Combined</div>
          <StackedVerticalBarChart
            data={combinedFatalRisk.map((r) => ({ label: r.fatal_risk, jsa: Number(r.jsa_count), flra: Number(r.flra_count) }))}
            seriesA="jsa" seriesB="flra" labelA="JSA" labelB="FLRA" colorA="#16253D" colorB="#B8862B"
          />
        </div>
      </div>

      <NonConformitiesPanel organizationId={organizationId} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
        <div className="bg-white border border-line rounded-md p-3">
          <div className="font-display text-[13px] font-semibold text-navy mb-2">CCV Leaderboard</div>
          <LeaderboardList people={ccvLeaderboard.map((p) => ({ user_id: p.user_id, email: p.email, count: Number(p.ccv_count) }))} emptyLabel="No CCVs recorded yet." />
        </div>
        <div className="bg-white border border-line rounded-md p-3">
          <div className="font-display text-[13px] font-semibold text-navy mb-2">FLRA Leaderboard</div>
          <LeaderboardList people={flraLeaderboard.map((p) => ({ user_id: p.user_id, email: p.email, count: Number(p.flra_count) }))} emptyLabel="No FLRAs recorded yet." />
        </div>
        <div className="bg-white border border-line rounded-md p-3">
          <div className="font-display text-[13px] font-semibold text-navy mb-1">Not Conducting (90 days)</div>
          <div className="text-[10px] text-inksoft mb-2">Members with zero CCVs and zero FLRAs in this window.</div>
          {notConducting.length ? (
            <div className="flex flex-col gap-1">
              {notConducting.map((p) => <div key={p.user_id} className="text-[11px] text-major">{p.email}</div>)}
            </div>
          ) : (
            <div className="text-xs text-conform italic">Everyone has recorded activity.</div>
          )}
        </div>
      </div>

      <div className="text-[11px] text-inksoft italic mt-6 mb-6">
        Section-level (as opposed to department-level) breakdown and organization-specific trend charts are still outstanding.
      </div>

      <div className="border-l-4 pl-3 mb-3" style={{ borderColor: '#16253D' }}>
        <h2 className="font-display text-base font-bold text-navy">Action Points</h2>
      </div>

      <div className="grid grid-cols-3 gap-2.5 mb-3">
        <StatCard label="Pending" value={actionStatusCounts.pending} />
        <StatCard label="Overdue" value={actionStatusCounts.overdue} />
        <StatCard label="Closed" value={actionStatusCounts.closed} />
      </div>

      <div className="bg-white border border-line rounded-md p-3">
        <div className="font-display text-[13px] font-semibold text-navy mb-1">All Actions — FLRA, CCV & JSA ({orgActions.length})</div>
        <div className="text-[10px] text-inksoft mb-2">Every outstanding and closed action for this organization, by source.</div>
        <div className="flex flex-col gap-1.5 max-h-96 overflow-y-auto">
          {orgActions.map((a) => {
            const sourceLabel = { flra: 'FLRA', ccv: 'CCV', jsa: 'JSA' }[a.source] || a.source
            const sourceColor = { flra: '#16253D', ccv: '#B8862B', jsa: '#6B4C9A' }[a.source] || '#5B5F66'
            const resolveFn = { flra: resolveFlraControl, ccv: resolveCcvAction, jsa: resolveJsaAction }[a.source]
            return (
              <div key={`${a.source}-${a.source_id}`} className="text-[11px] border border-line rounded p-1.5 flex justify-between items-start gap-2">
                <div>
                  <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded-full mr-1.5" style={{ background: `${sourceColor}18`, color: sourceColor }}>{sourceLabel}</span>
                  <span className="font-medium">{a.description}</span>
                  <div className="text-inksoft mt-0.5">
                    {a.responsible_person && `${a.responsible_person} • `}
                    {a.due_date ? `Due ${a.due_date}` : 'No due date set'}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <StatusBadge status={a.status} />
                  {a.status !== 'closed' && resolveFn && (
                    <button
                      onClick={async () => { await resolveFn(a.source_id); refreshActions() }}
                      className="text-[10px] text-conform border border-conform/40 px-1.5 py-0.5 rounded whitespace-nowrap"
                    >
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            )
          })}
          {!orgActions.length && <div className="text-[11px] text-inksoft italic">Nothing to show.</div>}
        </div>
      </div>
    </div>
  )
}
