import { useEffect, useState } from 'react'
import {
  getModuleCounts, getJSARiskAnalytics, getOutstandingFLRAControls,
  getOverdueCCVItems, getJSAActionsNoted, getFatalRiskFrequency, getActivityByCompany,
  getHazardNearMissCounts, getControlHierarchyUsage, getTimeToClose,
  getObservationTrend, getDailyReviewCompletion, getHazardClosureRate,
  getUnresolvedHazardReports, getUnresolvedNearMissReports,
  resolveHazardReport, resolveNearMissReport,
} from '../lib/analyticsRepo'
import { isPlatformAdmin, listAllOrganizations } from '../lib/platformAdminRepo'
import HazardIcon from './HazardIcon.jsx'
import CCVTargetsPanel from './CCVTargetsPanel.jsx'

const CONTROL_HIERARCHY_LABELS = { elimination: 'Elimination', substitution: 'Substitution', engineering: 'Engineering', administrative: 'Administrative', ppe: 'PPE' }
const HIERARCHY_COLORS = { elimination: '#2F6E4E', substitution: '#4C8C6B', engineering: '#C08A1E', administrative: '#B8862B', ppe: '#A83A2C' }

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

function Sparkline({ data, width = 480, height = 60 }) {
  if (!data.length) return null
  const max = Math.max(...data.map((d) => d.flra_count + d.ccv_count), 1)
  const stepX = width / Math.max(1, data.length - 1)
  const points = data.map((d, i) => `${i * stepX},${height - ((d.flra_count + d.ccv_count) / max) * height}`).join(' ')
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%">
      <polyline points={points} fill="none" stroke="#16253D" strokeWidth="2" />
      {data.map((d, i) => (
        <circle key={i} cx={i * stepX} cy={height - ((d.flra_count + d.ccv_count) / max) * height} r="2.5" fill="#B8862B" />
      ))}
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

export default function Dashboard() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [scopeMode, setScopeMode] = useState('own')
  const [orgs, setOrgs] = useState([])
  const [orgFilter, setOrgFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const [moduleCounts, setModuleCounts] = useState([])
  const [jsaRisk, setJsaRisk] = useState(null)
  const [outstandingFlra, setOutstandingFlra] = useState([])
  const [overdueCcv, setOverdueCcv] = useState([])
  const [jsaActions, setJsaActions] = useState([])
  const [fatalRiskFreq, setFatalRiskFreq] = useState([])
  const [activityByCompany, setActivityByCompany] = useState([])
  const [hazardNearMiss, setHazardNearMiss] = useState([])
  const [hierarchyUsage, setHierarchyUsage] = useState([])
  const [timeToClose, setTimeToClose] = useState(null)
  const [observationTrend, setObservationTrend] = useState([])
  const [dailyReviewCompletion, setDailyReviewCompletion] = useState(null)
  const [hazardClosure, setHazardClosure] = useState([])
  const [unresolvedHazards, setUnresolvedHazards] = useState([])
  const [unresolvedNearMisses, setUnresolvedNearMisses] = useState([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    isPlatformAdmin().then((admin) => {
      setIsAdmin(admin)
      if (admin) listAllOrganizations().then(setOrgs).catch(() => {})
    }).catch(() => {})
  }, [])

  useEffect(() => {
    const orgId = scopeMode === 'platform' ? (orgFilter || null) : null
    setLoading(true)
    setError('')
    Promise.all([
      getModuleCounts(scopeMode, orgId, dateFrom || null, dateTo || null),
      getJSARiskAnalytics(scopeMode, orgId, dateFrom || null, dateTo || null),
      getOutstandingFLRAControls(scopeMode, orgId),
      getOverdueCCVItems(scopeMode, orgId),
      getJSAActionsNoted(scopeMode, orgId),
      getFatalRiskFrequency(scopeMode, orgId),
      getActivityByCompany(scopeMode, orgId),
      getHazardNearMissCounts(scopeMode, orgId, dateFrom || null, dateTo || null),
      getControlHierarchyUsage(scopeMode, orgId),
      getTimeToClose(scopeMode, orgId),
      getObservationTrend(scopeMode, orgId, 12),
      getDailyReviewCompletion(scopeMode, orgId),
      getHazardClosureRate(scopeMode, orgId),
      getUnresolvedHazardReports(scopeMode, orgId),
      getUnresolvedNearMissReports(scopeMode, orgId),
    ])
      .then(([mc, jr, ofc, occ, ja, frf, abc, hnm, hu, ttc, ot, drc, hc, uh, un]) => {
        setModuleCounts(mc); setJsaRisk(jr); setOutstandingFlra(ofc); setOverdueCcv(occ)
        setJsaActions(ja); setFatalRiskFreq(frf); setActivityByCompany(abc); setHazardNearMiss(hnm)
        setHierarchyUsage(hu); setTimeToClose(ttc); setObservationTrend(ot)
        setDailyReviewCompletion(drc); setHazardClosure(hc)
        setUnresolvedHazards(uh); setUnresolvedNearMisses(un)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [scopeMode, orgFilter, dateFrom, dateTo])

  const refreshClosure = () => {
    const orgId = scopeMode === 'platform' ? (orgFilter || null) : null
    getHazardClosureRate(scopeMode, orgId).then(setHazardClosure)
    getUnresolvedHazardReports(scopeMode, orgId).then(setUnresolvedHazards)
    getUnresolvedNearMissReports(scopeMode, orgId).then(setUnresolvedNearMisses)
  }

  const handleResolveHazard = async (id) => {
    await resolveHazardReport(id)
    refreshClosure()
  }

  const handleResolveNearMiss = async (id) => {
    await resolveNearMissReport(id)
    refreshClosure()
  }

  const moduleTotals = ['jsa', 'flra', 'audit'].map((m) => ({
    label: m.toUpperCase(),
    value: moduleCounts.filter((r) => r.module === m).reduce((s, r) => s + Number(r.count), 0),
  }))

  const riskBandData = jsaRisk ? [
    { label: 'Raw — Low', value: Number(jsaRisk.raw_low) },
    { label: 'Raw — Medium', value: Number(jsaRisk.raw_medium) },
    { label: 'Raw — High', value: Number(jsaRisk.raw_high) },
    { label: 'Residual — Low', value: Number(jsaRisk.residual_low) },
    { label: 'Residual — Medium', value: Number(jsaRisk.residual_medium) },
    { label: 'Residual — High', value: Number(jsaRisk.residual_high) },
  ] : []

  const hierarchyData = Object.keys(CONTROL_HIERARCHY_LABELS).map((k) => ({
    label: CONTROL_HIERARCHY_LABELS[k],
    value: Number(hierarchyUsage.find((h) => h.hierarchy === k)?.count || 0),
    key: k,
  }))

  return (
    <div className="p-4 md:p-9">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-3 mb-5">
        <h1 className="font-display text-xl font-semibold text-navy">Dashboard</h1>

        {isAdmin && (
          <div className="flex gap-2">
            <button onClick={() => setScopeMode('own')} className={`text-xs px-3 py-1.5 rounded border ${scopeMode === 'own' ? 'bg-navy text-white border-navy' : 'border-line bg-white'}`}>
              My Data
            </button>
            <button onClick={() => setScopeMode('platform')} className={`text-xs px-3 py-1.5 rounded border ${scopeMode === 'platform' ? 'bg-navy text-white border-navy' : 'border-line bg-white'}`}>
              All Organizations
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-5 items-end">
        {scopeMode === 'platform' && (
          <div>
            <label className="block text-[10px] font-semibold text-navy2 uppercase mb-1">Organization</label>
            <select className="px-2.5 py-1.5 border border-line rounded text-xs" value={orgFilter} onChange={(e) => setOrgFilter(e.target.value)}>
              <option value="">All organizations</option>
              {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="block text-[10px] font-semibold text-navy2 uppercase mb-1">From</label>
          <input type="date" className="px-2.5 py-1.5 border border-line rounded text-xs" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-navy2 uppercase mb-1">To</label>
          <input type="date" className="px-2.5 py-1.5 border border-line rounded text-xs" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
      </div>

      {error && <div className="text-sm text-major bg-majorbg border border-major rounded p-3 mb-4">{error}</div>}
      {loading && <div className="text-sm text-inksoft mb-4">Loading…</div>}

      {/* Leading indicators row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard
          label="Avg. Time to Close"
          value={timeToClose?.avg_days_to_close ? `${Number(timeToClose.avg_days_to_close).toFixed(1)}d` : '—'}
          sub={`${timeToClose?.closed_count || 0} closed, ${timeToClose?.still_open_count || 0} open`}
        />
        <StatCard
          label="Daily Review Rate"
          value={dailyReviewCompletion?.completion_pct != null ? `${dailyReviewCompletion.completion_pct}%` : '—'}
          sub={`${dailyReviewCompletion?.completed_reviews || 0} of ${dailyReviewCompletion?.expected_reviews || 0}`}
        />
        <StatCard
          label="Hazard Closure Rate"
          value={hazardClosure.find((h) => h.report_type === 'hazard')?.closure_pct != null ? `${hazardClosure.find((h) => h.report_type === 'hazard').closure_pct}%` : '—'}
          sub="Hazards resolved"
        />
        <StatCard
          label="Near Miss Closure Rate"
          value={hazardClosure.find((h) => h.report_type === 'near_miss')?.closure_pct != null ? `${hazardClosure.find((h) => h.report_type === 'near_miss').closure_pct}%` : '—'}
          sub="Near misses resolved"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white border border-line rounded-md p-4">
          <div className="font-display text-sm font-semibold text-navy mb-3">Records by Module</div>
          <BarChart data={moduleTotals} />
        </div>

        <div className="bg-white border border-line rounded-md p-4">
          <div className="font-display text-sm font-semibold text-navy mb-1">JSA Risk Reduction</div>
          {jsaRisk && (
            <div className="text-[11px] text-inksoft mb-3">
              Avg raw score {jsaRisk.avg_raw_score ? Number(jsaRisk.avg_raw_score).toFixed(1) : '—'} → avg residual {jsaRisk.avg_residual_score ? Number(jsaRisk.avg_residual_score).toFixed(1) : '—'}
            </div>
          )}
          <BarChart data={riskBandData} colorFor={(d) => d.label.includes('High') ? '#A83A2C' : d.label.includes('Medium') ? '#C08A1E' : '#2F6E4E'} />
        </div>

        <div className="bg-white border border-line rounded-md p-4">
          <div className="font-display text-sm font-semibold text-navy mb-1">Control Hierarchy Usage (JSA)</div>
          <div className="text-[10.5px] text-inksoft mb-3">Elimination/Engineering are more effective than Administrative/PPE — a healthy safety culture leans left.</div>
          <BarChart data={hierarchyData} colorFor={(d) => HIERARCHY_COLORS[d.key]} />
        </div>

        <div className="bg-white border border-line rounded-md p-4">
          <div className="font-display text-sm font-semibold text-navy mb-1">Observation Trend (12 weeks)</div>
          <div className="text-[10.5px] text-inksoft mb-3">FLRA + CCV volume — rising trend signals more proactive safety checking.</div>
          <Sparkline data={observationTrend} />
        </div>

        <div className="bg-white border border-line rounded-md p-4">
          <div className="font-display text-sm font-semibold text-navy mb-3">Fatal Risk Frequency (JSA + FLRA)</div>
          <div className="flex flex-col gap-2">
            {fatalRiskFreq.slice(0, 10).map((r) => (
              <div key={r.fatal_risk} className="flex items-center gap-2">
                <HazardIcon templateName={r.fatal_risk} size={20} />
                <div className="text-xs flex-1">{r.fatal_risk}</div>
                <div className="text-xs font-semibold text-navy">{r.total_count}</div>
              </div>
            ))}
            {!fatalRiskFreq.length && <div className="text-xs text-inksoft italic">No data yet.</div>}
          </div>
        </div>

        <div className="bg-white border border-line rounded-md p-4">
          <div className="font-display text-sm font-semibold text-navy mb-3">Activity by Company</div>
          <BarChart data={activityByCompany.map((c) => ({ label: c.company_name, value: Number(c.jsa_count) + Number(c.flra_count) + Number(c.audit_count) }))} />
        </div>

        <div className="bg-white border border-line rounded-md p-4 lg:col-span-2">
          <div className="font-display text-sm font-semibold text-navy mb-1">Hazards & Near Misses Reported (from FLRA)</div>
          <div className="text-[11px] text-inksoft mb-3">
            {hazardNearMiss.filter((r) => r.report_type === 'hazard').reduce((s, r) => s + Number(r.count), 0)} hazard(s) •{' '}
            {hazardNearMiss.filter((r) => r.report_type === 'near_miss').reduce((s, r) => s + Number(r.count), 0)} near miss(es) reported this period
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-[10px] text-inksoft uppercase mb-2">Hazards by Company</div>
              <BarChart data={hazardNearMiss.filter((r) => r.report_type === 'hazard').map((r) => ({ label: r.company_name, value: Number(r.count) }))} colorFor={() => '#A83A2C'} />
            </div>
            <div>
              <div className="text-[10px] text-inksoft uppercase mb-2">Near Misses by Company</div>
              <BarChart data={hazardNearMiss.filter((r) => r.report_type === 'near_miss').map((r) => ({ label: r.company_name, value: Number(r.count) }))} colorFor={() => '#C08A1E'} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
        <div className="bg-white border border-line rounded-md p-4">
          <div className="font-display text-sm font-semibold text-navy mb-3">Unresolved Hazards ({unresolvedHazards.length})</div>
          <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
            {unresolvedHazards.map((h) => (
              <div key={h.id} className="text-xs border border-line rounded p-2 flex justify-between items-start gap-2">
                <div>
                  <div className="font-medium">{h.hazard_text}</div>
                  <div className="text-inksoft mt-0.5">{h.employee_name} • {new Date(h.created_at).toLocaleDateString()}</div>
                </div>
                <button onClick={() => handleResolveHazard(h.id)} className="text-[10px] text-conform border border-conform/40 px-2 py-1 rounded whitespace-nowrap">
                  Mark Resolved
                </button>
              </div>
            ))}
            {!unresolvedHazards.length && <div className="text-xs text-inksoft italic">No unresolved hazards.</div>}
          </div>
        </div>

        <div className="bg-white border border-line rounded-md p-4">
          <div className="font-display text-sm font-semibold text-navy mb-3">Unresolved Near Misses ({unresolvedNearMisses.length})</div>
          <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
            {unresolvedNearMisses.map((n) => (
              <div key={n.id} className="text-xs border border-line rounded p-2 flex justify-between items-start gap-2">
                <div>
                  <div className="font-medium">{n.description}</div>
                  <div className="text-inksoft mt-0.5">{n.employee_name} • {new Date(n.created_at).toLocaleDateString()}</div>
                </div>
                <button onClick={() => handleResolveNearMiss(n.id)} className="text-[10px] text-conform border border-conform/40 px-2 py-1 rounded whitespace-nowrap">
                  Mark Resolved
                </button>
              </div>
            ))}
            {!unresolvedNearMisses.length && <div className="text-xs text-inksoft italic">No unresolved near misses.</div>}
          </div>
        </div>
      </div>

      <div className="mt-5">
        <CCVTargetsPanel organizationId={scopeMode === 'platform' ? (orgFilter || null) : null} companyId={null} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
        <div className="bg-white border border-line rounded-md p-4">
          <div className="font-display text-sm font-semibold text-navy mb-3">Outstanding FLRA Controls ({outstandingFlra.length})</div>
          <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
            {outstandingFlra.map((c, i) => (
              <div key={i} className="text-xs border border-line rounded p-2">
                <div className="font-medium">[{c.fatal_risk}] {c.control_text}</div>
                <div className="text-inksoft mt-0.5">{c.employee_name} • Due {c.due_date || '—'}</div>
              </div>
            ))}
            {!outstandingFlra.length && <div className="text-xs text-inksoft italic">Nothing outstanding.</div>}
          </div>
        </div>

        <div className="bg-white border border-line rounded-md p-4">
          <div className="font-display text-sm font-semibold text-navy mb-3">Overdue CCV Items ({overdueCcv.length})</div>
          <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
            {overdueCcv.map((c, i) => (
              <div key={i} className="text-xs border border-line rounded p-2">
                <div className="font-medium">{c.template_name}</div>
                <div className="text-inksoft mt-0.5">{c.action_text} • Due {c.due_date}</div>
              </div>
            ))}
            {!overdueCcv.length && <div className="text-xs text-inksoft italic">Nothing overdue.</div>}
          </div>
        </div>
      </div>

      <div className="bg-white border border-line rounded-md p-4 mt-5">
        <div className="font-display text-sm font-semibold text-navy mb-1">JSA Actions Noted ({jsaActions.length})</div>
        <div className="text-[10.5px] text-inksoft mb-3">Free text only — JSA doesn't yet track whether these are resolved.</div>
        <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
          {jsaActions.map((a, i) => (
            <div key={i} className="text-xs border border-line rounded p-2">
              <div className="font-medium">{a.jsa_no || 'JSA'} — {a.job_task}</div>
              <div className="text-inksoft mt-0.5">{a.required_additional_actions}</div>
            </div>
          ))}
          {!jsaActions.length && <div className="text-xs text-inksoft italic">None noted.</div>}
        </div>
      </div>
    </div>
  )
}
