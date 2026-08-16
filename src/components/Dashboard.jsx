import { useEffect, useState, Fragment } from 'react'
import {
  getModuleCounts, getJSARiskAnalytics, getJSARiskTransition, getOutstandingFLRAControls,
  getOverdueCCVItems, getJSAActionsNoted, getFatalRiskFrequency, getActivityByCompany,
  getHazardNearMissCounts, getControlHierarchyUsage, getTimeToClose,
  getDailyObservationTrend, getDailyReviewCompletion, getHazardClosureRate,
  getUnresolvedHazardReports, getUnresolvedNearMissReports,
  getSafetyCultureScore,
  resolveHazardReport, resolveNearMissReport,
} from '../lib/analyticsRepo'
import { isPlatformAdmin, listAllOrganizations } from '../lib/platformAdminRepo'
import HazardIcon from './HazardIcon.jsx'
import CCVTargetsPanel from './CCVTargetsPanel.jsx'

const CONTROL_HIERARCHY_LABELS = { elimination: 'Elimination', substitution: 'Substitution', engineering: 'Engineering', administrative: 'Administrative', ppe: 'PPE' }
const HIERARCHY_COLORS = { elimination: '#2F6E4E', substitution: '#4C8C6B', engineering: '#C08A1E', administrative: '#B8862B', ppe: '#A83A2C' }

function VerticalBarChart({ data, height = 140, colorFor }) {
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
            <rect x={x} y={height - h} width={barW} height={h} fill={colorFor ? colorFor(d) : '#16253D'} rx="3" />
            <text x={x + barW / 2} y={height - h - 5} textAnchor="middle" fontSize="10.5" fontWeight="600" fill="#16253D">{d.value}</text>
            <text x={x + barW / 2} y={height + 13} textAnchor="middle" fontSize="9" fill="#5B5F66">{d.label.length > 9 ? d.label.slice(0, 8) + '…' : d.label}</text>
          </g>
        )
      })}
    </svg>
  )
}

function HorizontalBarChart({ data, width = 480, barHeight = 22, gap = 8, colorFor }) {
  if (!data.length) return <div className="text-xs text-inksoft italic">No data yet.</div>
  const max = Math.max(...data.map((d) => d.value), 1)
  const labelW = 120
  const chartW = width - labelW - 44
  return (
    <svg viewBox={`0 0 ${width} ${data.length * (barHeight + gap)}`} width="100%">
      {data.map((d, i) => {
        const y = i * (barHeight + gap)
        const w = Math.max(2, (d.value / max) * chartW)
        return (
          <g key={d.label}>
            <text x={labelW - 8} y={y + barHeight / 2 + 4} textAnchor="end" fontSize="10.5" fill="#5B5F66">{d.label}</text>
            <rect x={labelW} y={y} width={chartW} height={barHeight} fill="#F2EFE7" rx="3" />
            <rect x={labelW} y={y} width={w} height={barHeight} fill={colorFor ? colorFor(d) : '#16253D'} rx="3" />
            <text x={labelW + w + 5} y={y + barHeight / 2 + 4} fontSize="10.5" fontWeight="600" fill="#16253D">{d.value}</text>
          </g>
        )
      })}
    </svg>
  )
}

function DonutChart({ data, size = 130, strokeWidth = 22 }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  let offset = 0
  return (
    <div className="flex items-center justify-center gap-6 w-full">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#F2EFE7" strokeWidth={strokeWidth} />
        {total > 0 && (
          <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
            {data.filter((d) => d.value > 0).map((d, i) => {
              const frac = d.value / total
              const dash = frac * circumference
              const el = (
                <circle key={i} cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={d.color} strokeWidth={strokeWidth}
                  strokeDasharray={`${dash} ${circumference - dash}`} strokeDashoffset={-offset} />
              )
              offset += dash
              return el
            })}
          </g>
        )}
        <text x={size / 2} y={size / 2 + 5} textAnchor="middle" fontSize="19" fontWeight="700" fill="#16253D">{total}</text>
      </svg>
      <div className="flex flex-col gap-1.5">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-1.5 text-[10px]">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
            <span className="text-inksoft">{d.label}</span>
            <span className="font-semibold text-navy">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const CULTURE_COMPONENTS = [
  { key: 'hazard_closure_score', label: 'Hazard Closure', weight: 0.15, color: '#2F6E4E' },
  { key: 'near_miss_closure_score', label: 'Near Miss Closure', weight: 0.15, color: '#4C8C6B' },
  { key: 'hierarchy_quality_score', label: 'Control Quality', weight: 0.20, color: '#16253D' },
  { key: 'risk_reduction_score', label: 'Risk Reduction', weight: 0.20, color: '#B8862B' },
  { key: 'daily_review_score', label: 'Daily Reviews', weight: 0.15, color: '#6B4C9A' },
  { key: 'ccv_compliance_score', label: 'CCV Compliance', weight: 0.15, color: '#2C6E8F' },
]

function GaugeChart({ culture, size = 280 }) {
  const score = culture?.overall_score != null ? Number(culture.overall_score) : null
  const cx = size / 2
  const cy = size / 2 + 6
  const radius = size / 2 - 30
  const strokeW = 26

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

  return (
    <div className="flex flex-col items-center flex-shrink-0" style={{ width: size }}>
      <svg viewBox={`0 0 ${size} ${cy + 34}`} width="100%" style={{ maxWidth: size }}>
        <path d={arcPath(180, 120, radius)} stroke="#A83A2C" strokeWidth={strokeW} fill="none" strokeLinecap="round" />
        <path d={arcPath(120, 60, radius)} stroke="#C08A1E" strokeWidth={strokeW} fill="none" />
        <path d={arcPath(60, 0, radius)} stroke="#2F6E4E" strokeWidth={strokeW} fill="none" strokeLinecap="round" />

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
        <text x={cx} y={cy + 32} textAnchor="middle" fontSize="32" fontWeight="700" fill="#16253D">
          {hasScore ? Math.round(score) : '—'}
        </text>
      </svg>
      {hasScore && <div className="text-sm font-semibold -mt-1" style={{ color: zoneColor }}>{zoneLabel}</div>}
      {!hasScore && <div className="text-xs text-inksoft italic -mt-1">Not enough data yet</div>}

      <div className="flex items-center gap-3 mt-2 text-[10px] text-inksoft">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: '#A83A2C' }} /> 0–39</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: '#C08A1E' }} /> 40–69</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: '#2F6E4E' }} /> 70–100</span>
      </div>
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
      <div className="flex items-center gap-2 text-[9px] text-inksoft mt-0.5">
        <div className="w-[110px] flex-shrink-0" />
        <div className="flex-1" />
        <div className="w-9 flex-shrink-0 text-right">score</div>
        <div className="w-9 flex-shrink-0 text-right">weight</div>
      </div>
    </div>
  )
}


function RiskMatrix({ transitions }) {
  const bands = ['high', 'medium', 'low']
  const bandLabel = { high: 'High', medium: 'Medium', low: 'Low' }
  const getCount = (raw, residual) => Number(transitions.find((t) => t.raw_band === raw && t.residual_band === residual)?.count || 0)
  const total = transitions.reduce((s, t) => s + Number(t.count), 0)

  // bands[0]='high' (worst) ... bands[2]='low' (best), so a HIGHER index
  // means LOWER/better risk. Moving to a higher index = improvement.
  const outcome = (raw, residual) => {
    const rawIdx = bands.indexOf(raw)
    const residualIdx = bands.indexOf(residual)
    if (residualIdx > rawIdx) return 'improved'
    if (residualIdx === rawIdx) return 'unchanged'
    return 'worsened'
  }
  const OUTCOME_STYLE = {
    improved: { bg: '#DCEDE3', text: '#2F6E4E', border: '#B7DAC5' },
    unchanged: { bg: '#F7EAC9', text: '#96690F', border: '#EED89B' },
    worsened: { bg: '#F3CFC7', text: '#A83A2C', border: '#E8AC9F' },
  }

  const improvedCount = transitions.filter((t) => outcome(t.raw_band, t.residual_band) === 'improved').reduce((s, t) => s + Number(t.count), 0)
  const improvedPct = total > 0 ? Math.round((improvedCount / total) * 100) : null

  if (total === 0) return <div className="text-xs text-inksoft italic">No data yet.</div>

  return (
    <div className="w-full">
      {improvedPct != null && (
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-2xl font-display font-bold text-conform">{improvedPct}%</span>
          <span className="text-[11px] text-inksoft">of scored steps show reduced risk after controls</span>
        </div>
      )}
      <div className="w-full overflow-x-auto">
        <div className="grid gap-1.5 w-full" style={{ gridTemplateColumns: '60px repeat(3, minmax(0, 1fr))' }}>
          <div />
          {bands.map((c) => (
            <div key={c} className="text-center text-[11px] font-semibold text-navy2 pb-1">{bandLabel[c]}</div>
          ))}
          {bands.map((r) => (
            <Fragment key={r}>
              <div className="text-[11px] font-semibold text-navy2 flex items-center justify-end pr-2">{bandLabel[r]}</div>
              {bands.map((c) => {
                const count = getCount(r, c)
                const style = count > 0 ? OUTCOME_STYLE[outcome(r, c)] : { bg: '#FCFBF8', text: '#C9C2B0', border: '#EEE9DD' }
                return (
                  <div
                    key={r + c}
                    className="rounded-md flex items-center justify-center font-bold text-lg border"
                    style={{ background: style.bg, color: style.text, borderColor: style.border, height: 64 }}
                    title={`Raw ${bandLabel[r]} → Residual ${bandLabel[c]}: ${count}`}
                  >
                    {count > 0 ? count : '–'}
                  </div>
                )
              })}
            </Fragment>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3 mt-2.5 text-[10px] text-inksoft">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: OUTCOME_STYLE.improved.bg, border: `1px solid ${OUTCOME_STYLE.improved.border}` }} /> Improved</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: OUTCOME_STYLE.unchanged.bg, border: `1px solid ${OUTCOME_STYLE.unchanged.border}` }} /> Unchanged</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: OUTCOME_STYLE.worsened.bg, border: `1px solid ${OUTCOME_STYLE.worsened.border}` }} /> Worsened</span>
      </div>
      <div className="text-[10px] text-inksoft mt-1">Rows = Raw Risk, Columns = Residual Risk. {total} scored step(s) total.</div>
    </div>
  )
}

function DailyTrendChart({ data, width = 460, height = 190 }) {
  if (!data.length) return <div className="text-xs text-inksoft italic">No data yet.</div>

  const marginLeft = 28, marginRight = 34, marginTop = 10, marginBottom = 22
  const chartW = width - marginLeft - marginRight
  const chartH = height - marginTop - marginBottom

  let running = 0
  const points = data.map((d) => {
    const dailyTotal = Number(d.flra_count) + Number(d.ccv_count)
    running += dailyTotal
    return { ...d, dailyTotal, cumulative: running }
  })

  const barMax = Math.max(...points.map((p) => p.dailyTotal), 1)
  const lineMax = Math.max(...points.map((p) => p.cumulative), 1)
  const step = chartW / points.length
  const barW = Math.max(2, step * 0.55)

  const barY = (v) => marginTop + chartH - (v / barMax) * chartH
  const barH = (v) => (v / barMax) * chartH
  const lineY = (v) => marginTop + chartH - (v / lineMax) * chartH

  const linePoints = points.map((p, i) => `${marginLeft + i * step + step / 2},${lineY(p.cumulative)}`).join(' ')
  const labelEvery = Math.max(1, Math.ceil(points.length / 6))

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%">
      {/* baseline */}
      <line x1={marginLeft} y1={marginTop + chartH} x2={width - marginRight} y2={marginTop + chartH} stroke="#E4DFD2" strokeWidth="1" />

      {/* bars: daily count, primary (left) axis */}
      {points.map((p, i) => (
        <rect
          key={i}
          x={marginLeft + i * step + (step - barW) / 2}
          y={barY(p.dailyTotal)}
          width={barW}
          height={barH(p.dailyTotal)}
          fill="#B8862B"
          opacity="0.75"
          rx="1.5"
        >
          <title>{`${p.obs_day}: ${p.dailyTotal} record(s)`}</title>
        </rect>
      ))}

      {/* cumulative line, secondary (right) axis */}
      <polyline points={linePoints} fill="none" stroke="#16253D" strokeWidth="2" />
      {points.map((p, i) => (
        <circle key={i} cx={marginLeft + i * step + step / 2} cy={lineY(p.cumulative)} r="2" fill="#16253D">
          <title>{`${p.obs_day}: ${p.cumulative} cumulative`}</title>
        </circle>
      ))}

      {/* axis labels */}
      <text x={2} y={marginTop + 4} fontSize="8.5" fill="#B8862B" fontWeight="600">Daily</text>
      <text x={width - 2} y={marginTop + 4} fontSize="8.5" fill="#16253D" fontWeight="600" textAnchor="end">Cumulative</text>

      {/* x-axis date ticks, sparse to avoid crowding */}
      {points.map((p, i) => (i % labelEvery === 0 || i === points.length - 1) && (
        <text key={i} x={marginLeft + i * step + step / 2} y={height - 5} fontSize="8" fill="#5B5F66" textAnchor="middle">
          {p.obs_day.slice(5)}
        </text>
      ))}
    </svg>
  )
}

function TrendArrow({ current, previous, higherIsBetter = true }) {
  if (current == null || previous == null) return null
  const diff = current - previous
  if (Math.abs(diff) < 0.05) return <span className="text-[10.5px] text-inksoft">→ flat vs prior period</span>
  const improved = higherIsBetter ? diff > 0 : diff < 0
  const arrow = diff > 0 ? '↑' : '↓'
  return (
    <span className={`text-[10.5px] font-semibold ${improved ? 'text-conform' : 'text-major'}`}>
      {arrow} {Math.abs(diff).toFixed(1)} vs prior period
    </span>
  )
}

function StatCard({ label, value, sub, trend }) {
  return (
    <div className="bg-white border border-line rounded-md p-3">
      <div className="text-[10px] text-inksoft uppercase tracking-wide font-semibold">{label}</div>
      <div className="text-xl font-display font-bold text-navy mt-0.5">{value}</div>
      {sub && <div className="text-[10px] text-inksoft mt-0.5">{sub}</div>}
      {trend && <div className="mt-1">{trend}</div>}
    </div>
  )
}

function SectionHeader({ title, borderColor }) {
  return (
    <div className="border-l-4 pl-3 mb-3 mt-6 first:mt-0" style={{ borderColor }}>
      <h2 className="font-display text-base font-bold text-navy">{title}</h2>
    </div>
  )
}

function getPeriodRanges(dateFrom, dateTo) {
  const to = dateTo ? new Date(dateTo) : new Date()
  const from = dateFrom ? new Date(dateFrom) : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000)
  const lengthMs = Math.max(to - from, 24 * 60 * 60 * 1000)
  const prevTo = new Date(from.getTime() - 24 * 60 * 60 * 1000)
  const prevFrom = new Date(prevTo.getTime() - lengthMs)
  const fmt = (d) => d.toISOString().slice(0, 10)
  return {
    current: { from: dateFrom || fmt(from), to: dateTo || fmt(to) },
    previous: { from: fmt(prevFrom), to: fmt(prevTo) },
  }
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
  const [jsaRiskTransition, setJsaRiskTransition] = useState([])
  const [outstandingFlra, setOutstandingFlra] = useState([])
  const [overdueCcv, setOverdueCcv] = useState([])
  const [jsaActions, setJsaActions] = useState([])
  const [fatalRiskFreq, setFatalRiskFreq] = useState([])
  const [activityByCompany, setActivityByCompany] = useState([])
  const [hazardNearMiss, setHazardNearMiss] = useState([])
  const [hierarchyUsage, setHierarchyUsage] = useState([])
  const [timeToClose, setTimeToClose] = useState(null)
  const [timeToClosePrev, setTimeToClosePrev] = useState(null)
  const [dailyObservationTrend, setDailyObservationTrend] = useState([])
  const [trendStartDate, setTrendStartDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().slice(0, 10)
  })
  const [trendRangeDays, setTrendRangeDays] = useState(30)
  const [safetyCulture, setSafetyCulture] = useState(null)
  const [dailyReviewCompletion, setDailyReviewCompletion] = useState(null)
  const [dailyReviewCompletionPrev, setDailyReviewCompletionPrev] = useState(null)
  const [hazardClosure, setHazardClosure] = useState([])
  const [hazardClosurePrev, setHazardClosurePrev] = useState([])
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
    const periods = getPeriodRanges(dateFrom || null, dateTo || null)
    setLoading(true)
    setError('')
    Promise.all([
      getModuleCounts(scopeMode, orgId, dateFrom || null, dateTo || null),
      getJSARiskAnalytics(scopeMode, orgId, dateFrom || null, dateTo || null),
      getJSARiskTransition(scopeMode, orgId, dateFrom || null, dateTo || null),
      getOutstandingFLRAControls(scopeMode, orgId),
      getOverdueCCVItems(scopeMode, orgId),
      getJSAActionsNoted(scopeMode, orgId),
      getFatalRiskFrequency(scopeMode, orgId),
      getActivityByCompany(scopeMode, orgId),
      getHazardNearMissCounts(scopeMode, orgId, dateFrom || null, dateTo || null),
      getControlHierarchyUsage(scopeMode, orgId),
      getTimeToClose(scopeMode, orgId, periods.current.from, periods.current.to),
      getTimeToClose(scopeMode, orgId, periods.previous.from, periods.previous.to),
      getDailyReviewCompletion(scopeMode, orgId, periods.current.from, periods.current.to),
      getDailyReviewCompletion(scopeMode, orgId, periods.previous.from, periods.previous.to),
      getHazardClosureRate(scopeMode, orgId, periods.current.from, periods.current.to),
      getHazardClosureRate(scopeMode, orgId, periods.previous.from, periods.previous.to),
      getUnresolvedHazardReports(scopeMode, orgId),
      getUnresolvedNearMissReports(scopeMode, orgId),
    ])
      .then(([mc, jr, jrt, ofc, occ, ja, frf, abc, hnm, hu, ttc, ttcPrev, drc, drcPrev, hc, hcPrev, uh, unm]) => {
        setModuleCounts(mc); setJsaRisk(jr); setJsaRiskTransition(jrt); setOutstandingFlra(ofc); setOverdueCcv(occ)
        setJsaActions(ja); setFatalRiskFreq(frf); setActivityByCompany(abc); setHazardNearMiss(hnm)
        setHierarchyUsage(hu); setTimeToClose(ttc); setTimeToClosePrev(ttcPrev)
        setDailyReviewCompletion(drc); setDailyReviewCompletionPrev(drcPrev)
        setHazardClosure(hc); setHazardClosurePrev(hcPrev)
        setUnresolvedHazards(uh); setUnresolvedNearMisses(unm)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [scopeMode, orgFilter, dateFrom, dateTo])

  useEffect(() => {
    const orgId = scopeMode === 'platform' ? (orgFilter || null) : null
    const start = new Date(trendStartDate)
    const end = new Date(start)
    end.setDate(end.getDate() + trendRangeDays)
    const today = new Date()
    const cappedEnd = end > today ? today : end
    const dateTo = cappedEnd.toISOString().slice(0, 10)
    getDailyObservationTrend(scopeMode, orgId, trendRangeDays, trendStartDate, dateTo).then(setDailyObservationTrend).catch(() => {})
  }, [scopeMode, orgFilter, trendStartDate, trendRangeDays])

  useEffect(() => {
    const orgId = scopeMode === 'platform' ? (orgFilter || null) : null
    getSafetyCultureScore(scopeMode, orgId, 90).then(setSafetyCulture).catch(() => {})
  }, [scopeMode, orgFilter])

  const refreshClosure = () => {
    const orgId = scopeMode === 'platform' ? (orgFilter || null) : null
    getHazardClosureRate(scopeMode, orgId).then(setHazardClosure)
    getUnresolvedHazardReports(scopeMode, orgId).then(setUnresolvedHazards)
    getUnresolvedNearMissReports(scopeMode, orgId).then(setUnresolvedNearMisses)
  }

  const handleResolveHazard = async (id) => { await resolveHazardReport(id); refreshClosure() }
  const handleResolveNearMiss = async (id) => { await resolveNearMissReport(id); refreshClosure() }

  const moduleTotals = ['jsa', 'flra', 'audit'].map((m, i) => ({
    label: m.toUpperCase(),
    value: moduleCounts.filter((r) => r.module === m).reduce((s, r) => s + Number(r.count), 0),
    color: ['#16253D', '#B8862B', '#4C8C6B'][i],
  }))

  const hierarchyDonut = Object.keys(CONTROL_HIERARCHY_LABELS).map((k) => ({
    label: CONTROL_HIERARCHY_LABELS[k],
    value: Number(hierarchyUsage.find((h) => h.hierarchy === k)?.count || 0),
    color: HIERARCHY_COLORS[k],
  }))

  const closureNow = (type) => hazardClosure.find((h) => h.report_type === type)?.closure_pct
  const closurePrev = (type) => hazardClosurePrev.find((h) => h.report_type === type)?.closure_pct

  return (
    <div className="p-4 md:p-7">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-2 mb-3">
        <h1 className="font-display text-lg font-semibold text-navy">Dashboard</h1>
        {isAdmin && (
          <div className="flex gap-2">
            <button onClick={() => setScopeMode('own')} className={`text-[11px] px-2.5 py-1 rounded border ${scopeMode === 'own' ? 'bg-navy text-white border-navy' : 'border-line bg-white'}`}>My Data</button>
            <button onClick={() => setScopeMode('platform')} className={`text-[11px] px-2.5 py-1 rounded border ${scopeMode === 'platform' ? 'bg-navy text-white border-navy' : 'border-line bg-white'}`}>All Organizations</button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-3 items-end">
        {scopeMode === 'platform' && (
          <select className="px-2 py-1 border border-line rounded text-[11px]" value={orgFilter} onChange={(e) => setOrgFilter(e.target.value)}>
            <option value="">All organizations</option>
            {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        )}
        <input type="date" className="px-2 py-1 border border-line rounded text-[11px]" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        <span className="text-[11px] text-inksoft">to</span>
        <input type="date" className="px-2 py-1 border border-line rounded text-[11px]" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
      </div>

      {error && <div className="text-sm text-major bg-majorbg border border-major rounded p-2.5 mb-3">{error}</div>}
      {loading && <div className="text-sm text-inksoft mb-3">Loading…</div>}

      <div className="bg-white border border-line rounded-md p-5 mb-2 max-w-3xl">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <GaugeChart culture={safetyCulture} size={280} />
          <div className="flex-1 w-full pt-1">
            <div className="font-display text-base font-bold text-navy mb-1">Safety Culture Score</div>
            <div className="text-[11px] text-inksoft mb-3">Fixed 90-day window, independent of the filters above. Each metric below shows how well it's performing and how much weight it carries toward the final score.</div>
            <ComponentBreakdownList culture={safetyCulture} />
          </div>
        </div>
      </div>

      <SectionHeader title="Leading Indicators" borderColor="#2F6E4E" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-3">
        <StatCard
          label="Avg. Time to Close"
          value={timeToClose?.avg_days_to_close ? `${Number(timeToClose.avg_days_to_close).toFixed(1)}d` : '—'}
          sub={`${timeToClose?.closed_count || 0} closed, ${timeToClose?.still_open_count || 0} open`}
          trend={<TrendArrow current={timeToClose?.avg_days_to_close ? Number(timeToClose.avg_days_to_close) : null} previous={timeToClosePrev?.avg_days_to_close ? Number(timeToClosePrev.avg_days_to_close) : null} higherIsBetter={false} />}
        />
        <StatCard
          label="Daily Review Rate"
          value={dailyReviewCompletion?.completion_pct != null ? `${dailyReviewCompletion.completion_pct}%` : '—'}
          sub={`${dailyReviewCompletion?.completed_reviews || 0} of ${dailyReviewCompletion?.expected_reviews || 0}`}
          trend={<TrendArrow current={dailyReviewCompletion?.completion_pct} previous={dailyReviewCompletionPrev?.completion_pct} higherIsBetter={true} />}
        />
        <StatCard
          label="Hazard Closure Rate"
          value={closureNow('hazard') != null ? `${closureNow('hazard')}%` : '—'}
          sub="Hazards resolved"
          trend={<TrendArrow current={closureNow('hazard')} previous={closurePrev('hazard')} higherIsBetter={true} />}
        />
        <StatCard
          label="Near Miss Closure Rate"
          value={closureNow('near_miss') != null ? `${closureNow('near_miss')}%` : '—'}
          sub="Near misses resolved"
          trend={<TrendArrow current={closureNow('near_miss')} previous={closurePrev('near_miss')} higherIsBetter={true} />}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-white border border-line rounded-md p-3">
          <div className="font-display text-[13px] font-semibold text-navy mb-2">Control Hierarchy Usage (JSA)</div>
          <div className="text-[10px] text-inksoft mb-2">Elimination/Engineering are stronger than Administrative/PPE.</div>
          <HorizontalBarChart data={hierarchyDonut.map((d) => ({ label: d.label, value: d.value }))} colorFor={(d) => hierarchyDonut.find((h) => h.label === d.label)?.color} />
        </div>

        <div className="bg-white border border-line rounded-md p-3">
          <div className="font-display text-[13px] font-semibold text-navy mb-2">Observation Trend</div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <label className="text-[10px] text-inksoft">Start</label>
            <input type="date" className="px-1.5 py-0.5 border border-line rounded text-[10px]" value={trendStartDate} onChange={(e) => setTrendStartDate(e.target.value)} />
            <div className="flex gap-1">
              {[7, 30, 90].map((v) => (
                <button
                  key={v}
                  onClick={() => setTrendRangeDays(v)}
                  className={`text-[10px] px-1.5 py-0.5 rounded border ${trendRangeDays === v ? 'bg-navy text-white border-navy' : 'border-line bg-white text-inksoft'}`}
                >
                  {v}d
                </button>
              ))}
            </div>
          </div>
          <div className="text-[10px] text-inksoft mb-2">Bars = daily FLRA + CCV records (left axis). Line = cumulative total (right axis).</div>
          <DailyTrendChart data={dailyObservationTrend} />
        </div>
      </div>

      <SectionHeader title="Lagging Indicators" borderColor="#A83A2C" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-white border border-line rounded-md p-3">
          <div className="font-display text-[13px] font-semibold text-navy mb-2">Records by Module</div>
          <DonutChart data={moduleTotals} size={170} strokeWidth={28} />
        </div>

        <div className="bg-white border border-line rounded-md p-3">
          <div className="font-display text-[13px] font-semibold text-navy mb-2">JSA Risk Matrix: Raw → Residual</div>
          <RiskMatrix transitions={jsaRiskTransition} />
        </div>

        <div className="bg-white border border-line rounded-md p-3">
          <div className="font-display text-[13px] font-semibold text-navy mb-2">Fatal Risk Frequency (JSA + FLRA)</div>
          <VerticalBarChart data={fatalRiskFreq.slice(0, 8).map((r) => ({ label: r.fatal_risk, value: Number(r.total_count) }))} colorFor={() => '#16253D'} />
        </div>

        <div className="bg-white border border-line rounded-md p-3">
          <div className="font-display text-[13px] font-semibold text-navy mb-2">Activity by Company</div>
          <VerticalBarChart data={activityByCompany.map((c) => ({ label: c.company_name, value: Number(c.jsa_count) + Number(c.flra_count) + Number(c.audit_count) }))} colorFor={() => '#B8862B'} />
        </div>

        <div className="bg-white border border-line rounded-md p-3 md:col-span-2">
          <div className="font-display text-[13px] font-semibold text-navy mb-1">Hazards & Near Misses Reported</div>
          <div className="text-[10px] text-inksoft mb-2">
            {hazardNearMiss.filter((r) => r.report_type === 'hazard').reduce((s, r) => s + Number(r.count), 0)} hazard(s) •{' '}
            {hazardNearMiss.filter((r) => r.report_type === 'near_miss').reduce((s, r) => s + Number(r.count), 0)} near miss(es)
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <div className="text-[10px] text-inksoft uppercase mb-1">Hazards by Company</div>
              <HorizontalBarChart data={hazardNearMiss.filter((r) => r.report_type === 'hazard').map((r) => ({ label: r.company_name, value: Number(r.count) }))} colorFor={() => '#A83A2C'} />
            </div>
            <div>
              <div className="text-[10px] text-inksoft uppercase mb-1">Near Misses by Company</div>
              <HorizontalBarChart data={hazardNearMiss.filter((r) => r.report_type === 'near_miss').map((r) => ({ label: r.company_name, value: Number(r.count) }))} colorFor={() => '#C08A1E'} />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <CCVTargetsPanel organizationId={scopeMode === 'platform' ? (orgFilter || null) : null} companyId={null} />
      </div>

      <SectionHeader title="Action Items" borderColor="#16253D" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-white border border-line rounded-md p-3">
          <div className="font-display text-[13px] font-semibold text-navy mb-2">Unresolved Hazards ({unresolvedHazards.length})</div>
          <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto">
            {unresolvedHazards.map((h) => (
              <div key={h.id} className="text-[11px] border border-line rounded p-1.5 flex justify-between items-start gap-2">
                <div>
                  <div className="font-medium">{h.hazard_text}</div>
                  <div className="text-inksoft mt-0.5">{h.company_name} • {new Date(h.created_at).toLocaleDateString()}</div>
                </div>
                <button onClick={() => handleResolveHazard(h.id)} className="text-[10px] text-conform border border-conform/40 px-1.5 py-0.5 rounded whitespace-nowrap">Resolve</button>
              </div>
            ))}
            {!unresolvedHazards.length && <div className="text-[11px] text-inksoft italic">None outstanding.</div>}
          </div>
        </div>

        <div className="bg-white border border-line rounded-md p-3">
          <div className="font-display text-[13px] font-semibold text-navy mb-2">Unresolved Near Misses ({unresolvedNearMisses.length})</div>
          <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto">
            {unresolvedNearMisses.map((n) => (
              <div key={n.id} className="text-[11px] border border-line rounded p-1.5 flex justify-between items-start gap-2">
                <div>
                  <div className="font-medium">{n.description}</div>
                  <div className="text-inksoft mt-0.5">{n.company_name} • {new Date(n.created_at).toLocaleDateString()}</div>
                </div>
                <button onClick={() => handleResolveNearMiss(n.id)} className="text-[10px] text-conform border border-conform/40 px-1.5 py-0.5 rounded whitespace-nowrap">Resolve</button>
              </div>
            ))}
            {!unresolvedNearMisses.length && <div className="text-[11px] text-inksoft italic">None outstanding.</div>}
          </div>
        </div>

        <div className="bg-white border border-line rounded-md p-3">
          <div className="font-display text-[13px] font-semibold text-navy mb-2">Outstanding FLRA Controls ({outstandingFlra.length})</div>
          <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto">
            {outstandingFlra.map((c, i) => (
              <div key={i} className="text-[11px] border border-line rounded p-1.5">
                <div className="font-medium">[{c.fatal_risk}] {c.control_text}</div>
                <div className="text-inksoft mt-0.5">{c.employee_name} • Due {c.due_date || '—'}</div>
              </div>
            ))}
            {!outstandingFlra.length && <div className="text-[11px] text-inksoft italic">Nothing outstanding.</div>}
          </div>
        </div>

        <div className="bg-white border border-line rounded-md p-3">
          <div className="font-display text-[13px] font-semibold text-navy mb-2">Overdue CCV Items ({overdueCcv.length})</div>
          <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto">
            {overdueCcv.map((c, i) => (
              <div key={i} className="text-[11px] border border-line rounded p-1.5">
                <div className="font-medium">{c.template_name}</div>
                <div className="text-inksoft mt-0.5">{c.action_text} • Due {c.due_date}</div>
              </div>
            ))}
            {!overdueCcv.length && <div className="text-[11px] text-inksoft italic">Nothing overdue.</div>}
          </div>
        </div>

        <div className="bg-white border border-line rounded-md p-3 md:col-span-2">
          <div className="font-display text-[13px] font-semibold text-navy mb-1">JSA Actions Noted ({jsaActions.length})</div>
          <div className="text-[10px] text-inksoft mb-2">Free text only — JSA doesn't yet track resolution.</div>
          <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto">
            {jsaActions.map((a, i) => (
              <div key={i} className="text-[11px] border border-line rounded p-1.5">
                <div className="font-medium">{a.jsa_no || 'JSA'} — {a.job_task}</div>
                <div className="text-inksoft mt-0.5">{a.required_additional_actions}</div>
              </div>
            ))}
            {!jsaActions.length && <div className="text-[11px] text-inksoft italic">None noted.</div>}
          </div>
        </div>
      </div>
    </div>
  )
}
