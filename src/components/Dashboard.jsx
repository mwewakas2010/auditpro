import { useEffect, useState } from 'react'
import { getSafetyCultureScore } from '../lib/analyticsRepo'
import { isPlatformAdmin, listAllOrganizations } from '../lib/platformAdminRepo'

const CULTURE_COMPONENTS = [
  { key: 'hazard_closure_score', label: 'Hazard Closure', weight: 0.15, color: '#2F6E4E' },
  { key: 'near_miss_closure_score', label: 'Near Miss Closure', weight: 0.15, color: '#4C8C6B' },
  { key: 'hierarchy_quality_score', label: 'Control Quality', weight: 0.20, color: '#16253D' },
  { key: 'risk_reduction_score', label: 'Risk Reduction', weight: 0.20, color: '#B8862B' },
  { key: 'daily_review_score', label: 'Daily Reviews', weight: 0.15, color: '#6B4C9A' },
  { key: 'ccv_compliance_score', label: 'CCV Compliance', weight: 0.15, color: '#2C6E8F' },
]

function GaugeChart({ culture, size = 130 }) {
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
    <div className="flex flex-col items-center flex-shrink-0" style={{ width: size + 48 }}>
      <svg viewBox={`-24 0 ${size + 48} ${cy + 34}`} width="100%" style={{ maxWidth: size + 48 }}>
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
    </div>
  )
}

export default function Dashboard({ onOpenOrgDashboard }) {
  const [isAdmin, setIsAdmin] = useState(false)
  const [orgs, setOrgs] = useState([])
  const [perOrgCulture, setPerOrgCulture] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    isPlatformAdmin().then((admin) => {
      setIsAdmin(admin)
      if (admin) listAllOrganizations().then(setOrgs).catch(() => {})
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!isAdmin) return
    setLoading(true)
    Promise.all(
      orgs.map((o) =>
        getSafetyCultureScore('platform', o.id, 90)
          .then((culture) => ({ orgId: o.id, orgName: o.name, culture }))
          .catch(() => ({ orgId: o.id, orgName: o.name, culture: null }))
      )
    )
      .then(setPerOrgCulture)
      .finally(() => setLoading(false))
  }, [isAdmin, orgs])

  return (
    <div className="p-4 md:p-7">
      <h1 className="font-display text-lg font-semibold text-navy mb-1">All Organizations</h1>
      <div className="text-[11px] text-inksoft mb-5">Select an organization to open its dashboard.</div>

      {loading && <div className="text-sm text-inksoft mb-3">Loading…</div>}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {perOrgCulture.map((p) => (
          <div
            key={p.orgId}
            onClick={() => onOpenOrgDashboard && onOpenOrgDashboard(p.orgId, p.orgName)}
            className="border border-line rounded-md p-2.5 flex flex-col items-center cursor-pointer hover:border-navy2 bg-white"
          >
            <div className="text-[11px] font-medium text-navy text-center mb-1 truncate w-full">{p.orgName}</div>
            <GaugeChart culture={p.culture} size={130} />
          </div>
        ))}
      </div>

      {!isAdmin && (
        <div className="text-sm text-inksoft italic mt-4">
          Redirecting to your organization's dashboard…
        </div>
      )}
    </div>
  )
}
