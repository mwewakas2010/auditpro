import { useState } from 'react'
import { generateAuditPdf } from '../utils/pdfExport'
import { getStandardInfo } from '../data/standards'

function conclusionOptions(policyName) {
  return [
    {
      key: 'suitable_effective',
      title: 'System is suitable, adequate and effective',
      desc: `No major NCs; minor NCs (if any) do not undermine the system's ability to meet ${policyName} policy and objectives.`,
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
}

export default function ReportSignoff({ audit, setAudit, signoffs, setSignoffs, checklist, scope, clauses }) {
  const CONCLUSIONS = conclusionOptions(getStandardInfo(audit.standard).system.replace(' Management System', '').toLowerCase())
  const [reviewState, setReviewState] = useState({ loading: false, issues: null, rawFallback: null, error: null })

  const sign = (role, name) => {
    setSignoffs({ ...signoffs, [role]: { name, date: new Date().toLocaleDateString() } })
  }

  const runReview = async () => {
    setReviewState({ loading: true, issues: null, rawFallback: null, error: null })
    const findings = clauses
      .filter((c) => scope?.[c.clause_code]?.inScope !== false)
      .map((c) => ({ clauseCode: c.clause_code, title: c.title, ...checklist[c.clause_code] }))
      .filter((f) => f.status && f.status !== 'conform' && f.status !== 'na')
      .map((f) => ({
        clauseCode: f.clauseCode,
        title: f.title,
        status: f.status,
        evidenceText: f.evidenceText,
        evidenceAvailable: f.evidenceAvailable,
        followUp: f.followUp,
      }))

    try {
      const res = await fetch('/api/ai-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          standard: audit.standard,
          auditType: audit.audit_type,
          conclusion: CONCLUSIONS.find((c) => c.key === audit.conclusion)?.title || audit.conclusion,
          discontinued: audit.discontinued,
          discontinuationComment: audit.discontinuation_comment,
          findings,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Review request failed')
      setReviewState({ loading: false, issues: data.issues || [], rawFallback: data.rawFallback || null, error: null })
    } catch (err) {
      setReviewState({ loading: false, issues: null, rawFallback: null, error: err.message })
    }
  }

  return (
    <div>
      <h2 className="font-display text-[17px] font-semibold text-navy mb-1">
        Audit Conclusion & Sign-off
      </h2>
      <div className="text-[12.5px] text-inksoft mb-5">
        Based on {audit.standard} — is the management system suitable, adequate and effective?
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
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-display text-[15px] font-semibold text-navy">AI Report Review</h3>
          <button
            onClick={runReview}
            disabled={reviewState.loading}
            className="text-xs px-3 py-1.5 border border-gold text-gold rounded hover:bg-goldsoft disabled:opacity-40"
          >
            {reviewState.loading ? '🔍 Reviewing…' : '🔍 Review Report'}
          </button>
        </div>
        <div className="text-[12px] text-inksoft mb-2">
          Checks nonconformities for missing evidence, vague language, and contradictions with your conclusion —
          before you mark this report final. This is a helper check, not a substitute for your own judgment.
        </div>

        {reviewState.error && (
          <div className="text-[12.5px] text-major bg-majorbg border border-major rounded p-3 mt-2">
            {reviewState.error}
          </div>
        )}

        {reviewState.issues && reviewState.issues.length === 0 && (
          <div className="text-[12.5px] text-conform bg-conformbg border border-conform rounded p-3 mt-2">
            No issues found — findings look consistent and adequately evidenced.
          </div>
        )}

        {reviewState.issues && reviewState.issues.length > 0 && (
          <div className="flex flex-col gap-2 mt-2">
            {reviewState.issues.map((issue, i) => (
              <div
                key={i}
                className={`text-[12.5px] rounded p-3 border ${
                  issue.severity === 'high'
                    ? 'bg-majorbg border-major text-major'
                    : issue.severity === 'medium'
                    ? 'bg-minorbg border-minor text-minor'
                    : 'bg-ofibg border-ofi text-ofi'
                }`}
              >
                {issue.clause && <span className="font-mono font-semibold mr-1.5">{issue.clause}</span>}
                {issue.message}
              </div>
            ))}
          </div>
        )}

        {reviewState.rawFallback && (
          <div className="text-[12px] text-inksoft bg-paper border border-line rounded p-3 mt-2 whitespace-pre-wrap">
            {reviewState.rawFallback}
          </div>
        )}
      </div>

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
          onClick={async () => await generateAuditPdf({ audit, signoffs, checklist, scope, clauses })}
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
        Closing-meeting PPT generation and the in-app help chatbot arrive later in Phase 3.
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
