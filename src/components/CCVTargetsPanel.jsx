import { useEffect, useState } from 'react'
import { listCCVTargets, upsertCCVTarget, deleteCCVTarget, getCCVTargetPerformance } from '../lib/ccvTargetsRepo'

const DIMENSIONS = [
  { key: 'overall', label: 'Overall' },
  { key: 'section', label: 'Section' },
  { key: 'site', label: 'Site' },
  { key: 'department', label: 'Department' },
  { key: 'contractor', label: 'Contractor' },
]
const PERIODS = [
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'quarterly', label: 'Quarterly' },
  { key: 'annual', label: 'Annual' },
]

function ProgressBar({ actual, target, suffix = '' }) {
  if (!target) return <div className="text-xs text-inksoft">No target set</div>
  const pct = Math.min(100, Math.round((actual / target) * 100))
  const met = actual >= target
  return (
    <div>
      <div className="flex justify-between text-[11px] mb-1">
        <span className={met ? 'text-conform font-semibold' : 'text-inksoft'}>{actual}{suffix} / {target}{suffix}</span>
        <span className="text-inksoft">{pct}%</span>
      </div>
      <div className="w-full h-2 bg-nabg rounded-full overflow-hidden">
        <div className={`h-full ${met ? 'bg-conform' : 'bg-minor'}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function CCVTargetsPanel({ organizationId = null, companyId = null }) {
  const [targets, setTargets] = useState([])
  const [performance, setPerformance] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ dimensionType: 'overall', dimensionValue: '', periodType: 'monthly', volumeTarget: '', complianceTargetPct: '' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = async () => {
    setLoading(true)
    try {
      const [t, p] = await Promise.all([
        listCCVTargets(organizationId, companyId),
        getCCVTargetPerformance(organizationId, companyId),
      ])
      setTargets(t)
      setPerformance(p)
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }
  useEffect(() => { refresh() }, [organizationId, companyId])

  const handleAdd = async () => {
    setError('')
    try {
      await upsertCCVTarget({
        organizationId, companyId,
        dimensionType: form.dimensionType,
        dimensionValue: form.dimensionValue || null,
        periodType: form.periodType,
        volumeTarget: form.volumeTarget ? Number(form.volumeTarget) : null,
        complianceTargetPct: form.complianceTargetPct ? Number(form.complianceTargetPct) : null,
      })
      setForm({ dimensionType: 'overall', dimensionValue: '', periodType: 'monthly', volumeTarget: '', complianceTargetPct: '' })
      setShowForm(false)
      refresh()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this target?')) return
    try {
      await deleteCCVTarget(id)
      refresh()
    } catch (err) {
      setError(err.message)
    }
  }

  const inputCls = 'px-2.5 py-1.5 border border-line rounded text-xs'

  return (
    <div className="bg-white border border-line rounded-md p-4">
      <div className="flex justify-between items-center mb-3">
        <div className="font-display text-sm font-semibold text-navy">CCV Targets</div>
        <button onClick={() => setShowForm(!showForm)} className="text-xs text-navy border border-navy/40 px-2.5 py-1 rounded">
          {showForm ? 'Cancel' : '+ Add Target'}
        </button>
      </div>

      {error && <div className="text-xs text-major bg-majorbg border border-major rounded p-2 mb-3">{error}</div>}

      {showForm && (
        <div className="border border-line rounded p-3 mb-4 bg-paper/40">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-2">
            <select className={inputCls} value={form.dimensionType} onChange={(e) => setForm({ ...form, dimensionType: e.target.value })}>
              {DIMENSIONS.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
            </select>
            {form.dimensionType !== 'overall' && (
              <input className={inputCls} placeholder={`${DIMENSIONS.find((d) => d.key === form.dimensionType)?.label} name`} value={form.dimensionValue} onChange={(e) => setForm({ ...form, dimensionValue: e.target.value })} />
            )}
            <select className={inputCls} value={form.periodType} onChange={(e) => setForm({ ...form, periodType: e.target.value })}>
              {PERIODS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <input type="number" className={inputCls} placeholder="Volume target (# of CCVs)" value={form.volumeTarget} onChange={(e) => setForm({ ...form, volumeTarget: e.target.value })} />
            <input type="number" className={inputCls} placeholder="Compliance target (%)" value={form.complianceTargetPct} onChange={(e) => setForm({ ...form, complianceTargetPct: e.target.value })} />
          </div>
          <button onClick={handleAdd} className="text-xs bg-navy text-white px-3 py-1.5 rounded">Save Target</button>
        </div>
      )}

      {loading ? (
        <div className="text-xs text-inksoft">Loading…</div>
      ) : !performance.length ? (
        <div className="text-xs text-inksoft italic">No targets set yet.</div>
      ) : (
        <div className="flex flex-col gap-3">
          {performance.map((p) => (
            <div key={p.target_id} className="border border-line rounded p-3">
              <div className="flex justify-between items-start mb-2">
                <div className="text-xs font-medium text-navy">
                  {DIMENSIONS.find((d) => d.key === p.dimension_type)?.label}
                  {p.dimension_value && `: ${p.dimension_value}`}
                  <span className="text-inksoft font-normal"> — {PERIODS.find((pd) => pd.key === p.period_type)?.label} (current period)</span>
                </div>
                <button onClick={() => handleDelete(p.target_id)} className="text-[10px] text-major">Remove</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {p.volume_target && (
                  <div>
                    <div className="text-[10px] text-inksoft uppercase mb-1">Volume</div>
                    <ProgressBar actual={Number(p.actual_volume)} target={p.volume_target} />
                  </div>
                )}
                {p.compliance_target_pct && (
                  <div>
                    <div className="text-[10px] text-inksoft uppercase mb-1">Compliance Rate</div>
                    <ProgressBar actual={p.actual_compliance_pct != null ? Number(p.actual_compliance_pct) : 0} target={Number(p.compliance_target_pct)} suffix="%" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
