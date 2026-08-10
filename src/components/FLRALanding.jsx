import { useEffect, useState } from 'react'
import { listCompanies } from '../lib/companyRepo'
import { STOP_RESPONSIBILITY_STATEMENTS, STOP_BOXES, FLRA_INSTRUCTIONS, HIERARCHY_OF_CONTROLS } from '../data/flraContent'

const BOX_STYLES = {
  major: 'bg-major text-white',
  minor: 'bg-minor text-white',
  conform: 'bg-conform text-white',
}

export default function FLRALanding({ onAcknowledge, onCancel }) {
  const [companies, setCompanies] = useState([])
  const [companyId, setCompanyId] = useState(null)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    listCompanies().then(setCompanies).catch(() => {})
  }, [])

  const company = companies.find((c) => c.id === companyId)

  return (
    <div className="p-4 md:p-9 max-w-2xl mx-auto">
      {/* Header - company branding replaces the source doc's Barrick letterhead */}
      <div className="bg-navy text-white rounded-t-md px-5 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2.5">
          {company?.logo_url ? (
            <img src={company.logo_url} alt="" className="h-8 object-contain bg-white rounded px-1.5 py-0.5" />
          ) : (
            <span className="font-display font-bold text-lg">AuditPro</span>
          )}
        </div>
        <select
          value={companyId || ''}
          onChange={(e) => setCompanyId(e.target.value || null)}
          className="text-xs bg-white/10 border border-white/20 rounded px-2 py-1 text-white"
        >
          <option value="" className="text-navy">No company selected</option>
          {companies.map((co) => (
            <option key={co.id} value={co.id} className="text-navy">{co.name}</option>
          ))}
        </select>
      </div>

      <div className="bg-white border border-line rounded-b-md p-5 md:p-7 mb-5">
        <h1 className="font-display text-2xl font-bold text-navy mb-1">Field Level Risk Assessment</h1>
        <div className="text-xs text-inksoft uppercase tracking-wide font-mono mb-6">Booklet — Responsibility to Stop Unsafe Work</div>

        <div className="flex items-center gap-4 mb-5">
          <div className="w-16 h-16 rounded-full bg-major flex items-center justify-center flex-shrink-0">
            <span className="font-display font-bold text-white text-xl">STOP</span>
          </div>
          <div className="font-display text-lg font-semibold text-navy">Responsibility to Stop Unsafe Work</div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-6">
          {STOP_BOXES.map((box) => (
            <div key={box.label} className={`rounded px-3 py-2.5 text-center font-display font-semibold text-sm ${BOX_STYLES[box.color]}`}>
              {box.label}
            </div>
          ))}
        </div>

        <div className="border-t border-line pt-4">
          <div className="font-display font-bold text-navy text-[15px] mb-3">Do It Safely Or Not At All</div>
          <ul className="flex flex-col gap-2">
            {STOP_RESPONSIBILITY_STATEMENTS.map((s, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <span className="text-gold flex-shrink-0">■</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="bg-white border border-line rounded-md p-5 md:p-7 mb-5">
        <h2 className="font-display text-lg font-bold text-navy mb-3">FLRA Instructions</h2>
        <div className="text-sm text-inksoft mb-5">{FLRA_INSTRUCTIONS.intro}</div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="bg-navy text-white text-xs font-display font-bold px-2.5 py-1.5 rounded-t">WHY?</div>
            <ul className="border border-t-0 border-line rounded-b p-2.5 text-xs flex flex-col gap-1.5">
              {FLRA_INSTRUCTIONS.why.map((s, i) => <li key={i}>• {s}</li>)}
            </ul>
          </div>
          <div>
            <div className="bg-navy text-white text-xs font-display font-bold px-2.5 py-1.5 rounded-t">WHO?</div>
            <ul className="border border-t-0 border-line rounded-b p-2.5 text-xs flex flex-col gap-1.5">
              {FLRA_INSTRUCTIONS.who.map((s, i) => <li key={i}>• {s}</li>)}
            </ul>
          </div>
          <div>
            <div className="bg-navy text-white text-xs font-display font-bold px-2.5 py-1.5 rounded-t">WHEN?</div>
            <ul className="border border-t-0 border-line rounded-b p-2.5 text-xs flex flex-col gap-1.5">
              {FLRA_INSTRUCTIONS.when.map((s, i) => <li key={i}>• {s}</li>)}
            </ul>
          </div>
        </div>

        <div className="mt-5">
          <div className="font-display font-bold text-navy text-sm mb-2 uppercase tracking-wide">Hierarchy of Controls</div>
          <div className="flex flex-col gap-1">
            {HIERARCHY_OF_CONTROLS.map((h, i) => (
              <div
                key={h.level}
                className="flex items-center gap-3 py-1.5 px-3 text-white text-xs font-medium rounded"
                style={{ backgroundColor: h.color, marginLeft: i * 18, marginRight: i * 18 }}
              >
                <span className="font-display font-bold">{h.level}</span>
                <span className="opacity-90">— {h.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white border border-line rounded-md p-5 md:p-7">
        <label className="flex items-start gap-2.5 text-sm mb-4">
          <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="mt-0.5" />
          <span>I have read and understood the above. I acknowledge my responsibility to stop unsafe work.</span>
        </label>
        <div className="flex gap-3">
          <button
            onClick={() => onAcknowledge({ companyId })}
            disabled={!checked}
            className="bg-navy text-white px-5 py-2.5 rounded font-medium text-sm disabled:opacity-40"
          >
            Continue to FLRA
          </button>
          <button onClick={onCancel} className="bg-white text-navy border-[1.5px] border-navy px-5 py-2.5 rounded font-medium text-sm">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
