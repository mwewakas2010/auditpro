import { generateAuditPdf } from '../utils/pdfExport'

const CONCLUSIONS = [
  {
    key: 'suitable_effective',
    title: 'System is suitable, adequate and effective',
    desc: 'No major NCs; minor NCs (if any) do not undermine the system\u2019s ability to meet OHS policy and objectives.',
  },
  {
    key: 'adequate_not_effective',
    title: 'System is adequate but not fully effective',
    desc: 'Design meets the standard\u2019s intent, but implementation gaps limit effectiveness — minor NCs present, follow-up required.',
  },
  {
    key: 'not_suitable',
    title: 'System is not suitable / not adequate',
    desc: 'One or more Major NCs indicate the system cannot currently ensure conformity — recommend re-audit after corrective action.',
  },
]

export default function ReportSignoff({ audit, setAudit, signoffs, setSignoffs, checklist, scope }) {
  const sign = (role, name) => {
    setSignoffs({ ...signoffs, [role]: { name, date: new Date().toLocaleDateString() } })
  }

  return (
    <div>
      <h2 className="font-display text-[17px] font-semibold text-navy mb-1">
        Audit Conclusion & Sign-off
      </h2>
      <div className="text-[12.5px] text-inksoft mb-5">
        Based on ISO 45001:2018 — is the management system suitable, adequate and effective?
      </div>

      <div className="bg-white border border-line rounded-md p-6 mb-5">
        <div className="flex flex-col gap-2.5">
          {CONCLUSIONS.map((c) => (
            <label
              key={c.key}
              className={`flex items-start gap-2.5 p-3.5 border-[1.5px] rounded-md cursor-pointer ${
                audit.conclusion === c.key ? 'border-navy bg-[#F2F4F8]' : 'border-line'
              }`}
            >
              <input
                type="radio"
                name="conclusion"
                className="mt-0.5"
                checked={audit.conclusion === c.key}
                onChange={() => setAudit({ ...audit, conclusion: c.key })}
              />
              <div>
                <div className="font-semibold text-[13.5px]">{c.title}</div>
                <div className="text-xs text-inksoft mt-0.5">{c.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {audit.discontinued && (
        <div className="bg-white border border-major rounded-md p-6 mb-5">
          <h3 className="font-display text-[15px] font-semibold text-major mb-1">
            Audit Discontinued
          </h3>
          <div className="text-[13px]">{audit.discontinuation_comment || 'No reason recorded.'}</div>
        </div>
      )}

      <div className="bg-white border border-line rounded-md p-6 mb-5">
        <h3 className="font-display text-[15px] font-semibold text-navy mb-4">Sign-off</h3>
        <div className="grid grid-cols-2 gap-4">
          <SignPad
            label={`Lead Auditor — ${audit.lead_auditor || '(not set)'}`}
            signed={signoffs.lead_auditor}
            onSign={() => sign('lead_auditor', audit.lead_auditor || 'Lead Auditor')}
          />
          <SignPad
            label={`Auditee Representative — ${audit.process_owner || '(not set)'}`}
            signed={signoffs.auditee_rep}
            onSign={() => sign('auditee_rep', audit.process_owner || 'Auditee Representative')}
          />
        </div>
      </div>

      <div className="flex gap-3">
        <button
          className="bg-navy text-white px-5.5 py-2.5 rounded font-medium text-[13.5px]"
          onClick={async () => await generateAuditPdf({ audit, signoffs, checklist, scope })}
        >
          Export Draft PDF
        </button>
        <button
          className="bg-white text-navy border-[1.5px] border-navy px-5 py-2.5 rounded font-medium text-[13.5px]"
          onClick={() => alert('Phase 2: generates a matching .docx for editing.')}
        >
          Export Word (.docx)
        </button>
        <button
          className="bg-white text-navy border-[1.5px] border-navy px-5 py-2.5 rounded font-medium text-[13.5px]"
          onClick={() => setAudit({ ...audit, status: 'final' })}
        >
          Mark as Final
        </button>
      </div>
      <div className="text-[11px] text-[#A39F92] italic mt-1.5">
        AI report review and closing-meeting PPT generation arrive in Phase 3.
      </div>
    </div>
  )
}

function SignPad({ label, signed, onSign }) {
  return (
    <div>
      <label className="block text-[11.5px] font-semibold text-navy2 mb-1.5 uppercase tracking-wide">
        {label}
      </label>
      <div
        onClick={onSign}
        className={`border-[1.5px] rounded-md h-[90px] flex items-center justify-center cursor-pointer ${
          signed
            ? 'border-solid border-conform bg-white text-navy font-display text-xl'
            : 'border-dashed border-line bg-[#FCFBF8] text-inksoft text-xs italic font-display'
        }`}
      >
        {signed ? `${signed.name} — ${signed.date}` : 'Click to sign'}
      </div>
    </div>
  )
}
