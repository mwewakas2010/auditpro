import { useEffect, useState } from 'react'
import { STANDARD_LIST, getStandardInfo } from '../data/standards'
import {
  AUDIT_TYPES,
  DISCONTINUATION_CONDITIONS,
  defaultScopeText,
  DEFAULT_METHODOLOGY_NARRATIVE,
  DEFAULT_SAMPLING_DISCLAIMER,
  DEFAULT_CONFIDENTIALITY_STATEMENT,
} from '../data/schemes'
import { listCompanies, createCompany, createDepartment } from '../lib/companyRepo'
import { cacheCompaniesList, getCachedCompaniesList } from '../lib/offlineStore'

const METHODS = [
  { key: 'interviews', label: 'Interviews' },
  { key: 'document_review', label: 'Desktop / Document Review' },
  { key: 'field_visit', label: 'Field Visit' },
]

function Field({ label, children }) {
  return (
    <div className="mb-3.5">
      <label className="block text-[11.5px] font-semibold text-navy2 mb-1.5 uppercase tracking-wide">
        {label}
      </label>
      {children}
    </div>
  )
}

const inputCls =
  'w-full px-2.5 py-2 border border-line rounded text-[13.5px] bg-[#FCFBF8] text-ink focus:outline focus:outline-2 focus:outline-gold'

export default function AuditSetup({ audit, setAudit, scope, setScope, clauses, onStandardChange }) {
  const update = (key) => (e) => setAudit({ ...audit, [key]: e.target.value })
  const [companies, setCompanies] = useState([])
  const [companiesError, setCompaniesError] = useState('')
  const [usingCachedCompanies, setUsingCachedCompanies] = useState(false)

  useEffect(() => {
    listCompanies()
      .then((data) => {
        setCompanies(data)
        cacheCompaniesList(data)
        setUsingCachedCompanies(false)
      })
      .catch(() => {
        const cached = getCachedCompaniesList()
        if (cached.length) {
          setCompanies(cached)
          setUsingCachedCompanies(true)
        } else {
          setCompaniesError('Could not load companies (no connection, and nothing cached on this device yet).')
        }
      })
  }, [])

  const selectedCompany = companies.find((c) => c.id === audit.company_id)

  const refreshCompanies = async () => {
    try {
      setCompanies(await listCompanies())
    } catch (err) {
      setCompaniesError(err.message)
    }
  }

  const handleCompanyChange = async (e) => {
    const val = e.target.value
    if (val === '__new__') {
      const name = prompt('New company name:')
      if (!name || !name.trim()) return
      try {
        const id = await createCompany(name.trim(), null)
        const updated = await listCompanies()
        setCompanies(updated)
        const co = updated.find((c) => c.id === id)
        setAudit({ ...audit, company_id: id, client_name: co.name, department_id: null, department: '', logo_url: co.logo_url || null })
      } catch (err) {
        setCompaniesError(err.message)
      }
      return
    }
    const co = companies.find((c) => c.id === val)
    if (!co) return
    setAudit({ ...audit, company_id: co.id, client_name: co.name, department_id: null, department: '', logo_url: co.logo_url || null })
  }

  const handleDepartmentChange = async (e) => {
    const val = e.target.value
    if (val === '__new__') {
      const name = prompt('New department name:')
      if (!name || !name.trim()) return
      try {
        const id = await createDepartment(audit.company_id, name.trim())
        await refreshCompanies()
        setAudit({ ...audit, department_id: id, department: name.trim() })
      } catch (err) {
        setCompaniesError(err.message)
      }
      return
    }
    const dept = selectedCompany?.company_departments?.find((d) => d.id === val)
    setAudit({ ...audit, department_id: dept?.id || null, department: dept?.name || '' })
  }

  const toggleMethod = (key) => {
    const has = audit.methodology.includes(key)
    setAudit({
      ...audit,
      methodology: has
        ? audit.methodology.filter((m) => m !== key)
        : [...audit.methodology, key],
    })
  }

  const setClauseScope = (code, inScope) => {
    setScope({ ...scope, [code]: { ...scope[code], inScope, exclusionReason: inScope ? '' : scope[code].exclusionReason } })
  }
  const setExclusionReason = (code, reason) => {
    setScope({ ...scope, [code]: { ...scope[code], exclusionReason: reason } })
  }

  const toggleDiscCondition = (key) => {
    const has = audit.discontinuation_conditions.includes(key)
    setAudit({
      ...audit,
      discontinuation_conditions: has
        ? audit.discontinuation_conditions.filter((c) => c !== key)
        : [...audit.discontinuation_conditions, key],
    })
  }

  return (
    <div>
      <h2 className="font-display text-[17px] font-semibold text-navy mb-1">Audit Setup</h2>
      <div className="text-[12.5px] text-inksoft mb-5">
        Define criteria, participants and scope before fieldwork begins.
      </div>

      <div className="bg-white border border-line rounded-md p-4 md:p-6 mb-5">
        <Field label="Audit Criteria">
          <div className="flex gap-2.5 flex-wrap">
            {STANDARD_LIST.map((std) => (
              <div
                key={std.key}
                onClick={() => onStandardChange(std.key)}
                className={`px-4 py-2 rounded-full text-sm border-[1.5px] cursor-pointer ${
                  audit.standard === std.key ? 'bg-navy text-white border-navy' : 'border-line bg-white hover:border-navy2'
                }`}
              >
                {std.label}
              </div>
            ))}
          </div>
          <div className="text-[11px] text-inksoft italic mt-2">
            Switching standards resets the clause scope and checklist for this audit to the new standard's clauses.
          </div>
        </Field>

        {companiesError && (
          <div className="text-[11.5px] text-major bg-majorbg border border-major rounded p-2 mb-3">{companiesError}</div>
        )}
        {usingCachedCompanies && (
          <div className="text-[11.5px] text-minor bg-minorbg border border-minor rounded p-2 mb-3">
            📴 No connection — showing the last company list saved on this device. Adding a brand-new company or
            department needs a connection, but selecting an existing one works fine offline.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Company / Client">
            <select className={inputCls} value={audit.company_id || ''} onChange={handleCompanyChange}>
              <option value="" disabled>Select a company…</option>
              {companies.map((co) => (
                <option key={co.id} value={co.id}>{co.name}</option>
              ))}
              <option value="__new__">+ New company…</option>
            </select>
          </Field>
          <Field label="Client Logo">
            <div className="border-[1.5px] border-line rounded-md p-3 flex items-center gap-3 bg-[#FCFBF8]">
              {audit.logo_url ? (
                <img src={audit.logo_url} alt="Client logo" className="h-10 object-contain" />
              ) : (
                <span className="text-[12px] text-inksoft">No logo set for this company yet.</span>
              )}
            </div>
            <div className="text-[10.5px] text-inksoft italic mt-1">
              Logos are managed per company now, not per audit — go to "Manage Companies" from My Audits to upload
              or change one, and it applies to every audit for that client.
            </div>
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Department / Section">
            <select
              className={inputCls}
              value={audit.department_id || ''}
              onChange={handleDepartmentChange}
              disabled={!audit.company_id}
            >
              <option value="" disabled>{audit.company_id ? 'Select a department…' : 'Select a company first'}</option>
              {(selectedCompany?.company_departments || []).map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
              {audit.company_id && <option value="__new__">+ New department…</option>}
            </select>
          </Field>
          <Field label="Process Owner">
            <input className={inputCls} value={audit.process_owner} onChange={update('process_owner')} />
          </Field>
          <Field label="Other Participants">
            <input className={inputCls} value={audit.other_participants} onChange={update('other_participants')} />
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Lead Auditor">
            <input className={inputCls} value={audit.lead_auditor} onChange={update('lead_auditor')} />
          </Field>
          <Field label="Audit Team Member(s)">
            <input className={inputCls} value={audit.audit_team} onChange={update('audit_team')} />
          </Field>
          <Field label="Audit Type">
            <select className={inputCls} value={audit.audit_type} onChange={update('audit_type')}>
              {AUDIT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Audit Start Date">
            <input type="date" className={inputCls} value={audit.start_date} onChange={update('start_date')} />
          </Field>
          <Field label="Audit End Date">
            <input type="date" className={inputCls} value={audit.end_date} onChange={update('end_date')} />
          </Field>
          <Field label="Field Visit Area(s)">
            <input className={inputCls} value={audit.field_visit_areas} onChange={update('field_visit_areas')} />
          </Field>
        </div>

        <Field label="Audit Scope & Objectives">
          <textarea
            className={inputCls + ' min-h-[90px]'}
            value={audit.scope_text || defaultScopeText(audit.standard, getStandardInfo(audit.standard).system)}
            onChange={update('scope_text')}
          />
        </Field>
      </div>

      {/* Clause scope */}
      <div className="bg-white border border-line rounded-md p-4 md:p-6 mb-5">
        <h3 className="font-display text-[15px] font-semibold text-navy mb-1">
          Clause Scope — set what will and won't be audited
        </h3>
        <div className="text-[12.5px] text-inksoft mb-4">
          Toggle each clause In / Out. Excluded clauses require a reason — this appears in the final report.
        </div>
        <div className="hidden md:grid grid-cols-[70px_1fr_90px_1fr] gap-3 pb-2 border-b-2 border-line text-[11px] uppercase text-inksoft">
          <div>Clause</div><div>Title</div><div>Scope</div><div>Reason if excluded</div>
        </div>
        {clauses.map((c) => {
          const s = scope[c.clause_code]
          return (
            <div key={c.clause_code} className="py-3 border-b border-line last:border-0">
              {/* Desktop: single-row table layout */}
              <div className="hidden md:grid grid-cols-[70px_1fr_90px_1fr] gap-3 items-start">
                <div className="font-mono text-[12.5px] text-navy2 font-semibold pt-1.5">{c.clause_code}</div>
                <div className="text-[13px] pt-1.5">{c.title}</div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setClauseScope(c.clause_code, true)}
                    className={`text-[11px] px-2.5 py-1 rounded border ${s.inScope ? 'bg-conform text-white border-conform' : 'border-line bg-white'}`}
                  >In</button>
                  <button
                    onClick={() => setClauseScope(c.clause_code, false)}
                    className={`text-[11px] px-2.5 py-1 rounded border ${!s.inScope ? 'bg-nabg text-na border-na' : 'border-line bg-white'}`}
                  >Out</button>
                </div>
                <input
                  type="text"
                  placeholder="Reason for exclusion"
                  disabled={s.inScope}
                  value={s.exclusionReason}
                  onChange={(e) => setExclusionReason(c.clause_code, e.target.value)}
                  className="w-full px-2 py-1.5 border border-line rounded text-[12.5px] disabled:bg-[#F1EFE9] disabled:text-[#B7B3A6]"
                />
              </div>

              {/* Mobile: stacked card layout */}
              <div className="md:hidden">
                <div className="flex justify-between items-start gap-2 mb-2">
                  <div>
                    <div className="font-mono text-[12.5px] text-navy2 font-semibold">{c.clause_code}</div>
                    <div className="text-[13px] mt-0.5">{c.title}</div>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => setClauseScope(c.clause_code, true)}
                      className={`text-xs px-3 py-1.5 rounded border ${s.inScope ? 'bg-conform text-white border-conform' : 'border-line bg-white'}`}
                    >In</button>
                    <button
                      onClick={() => setClauseScope(c.clause_code, false)}
                      className={`text-xs px-3 py-1.5 rounded border ${!s.inScope ? 'bg-nabg text-na border-na' : 'border-line bg-white'}`}
                    >Out</button>
                  </div>
                </div>
                {!s.inScope && (
                  <input
                    type="text"
                    placeholder="Reason for exclusion"
                    value={s.exclusionReason}
                    onChange={(e) => setExclusionReason(c.clause_code, e.target.value)}
                    className="w-full px-2.5 py-2 border border-line rounded text-sm"
                  />
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Methodology & statements */}
      <div className="bg-white border border-line rounded-md p-4 md:p-6">
        <h3 className="font-display text-[15px] font-semibold text-navy mb-1">
          Methodology & Audit Assurance Statements
        </h3>
        <div className="text-[12.5px] text-inksoft mb-4">
          These appear in the final report as the audit's methodology and standard assurance statements.
        </div>

        <Field label="Audit Methodology">
          <div className="flex gap-2.5 flex-wrap">
            {METHODS.map((m) => (
              <div
                key={m.key}
                onClick={() => toggleMethod(m.key)}
                className={`px-4 py-2 rounded-full text-sm border-[1.5px] cursor-pointer ${
                  audit.methodology.includes(m.key) ? 'bg-navy text-white border-navy' : 'border-line bg-white'
                }`}
              >
                {m.label}
              </div>
            ))}
          </div>
        </Field>

        <Field label="Methodology Narrative (used in report)">
          <textarea
            className={inputCls + ' min-h-[80px]'}
            value={audit.methodology_narrative || DEFAULT_METHODOLOGY_NARRATIVE}
            onChange={update('methodology_narrative')}
          />
        </Field>

        <Field label="Sampling Disclaimer">
          <textarea
            className={inputCls + ' min-h-[70px]'}
            value={audit.sampling_disclaimer || DEFAULT_SAMPLING_DISCLAIMER}
            onChange={update('sampling_disclaimer')}
          />
        </Field>

        <Field label="Confidentiality & Objectivity Statement">
          <textarea
            className={inputCls + ' min-h-[70px]'}
            value={audit.confidentiality_statement || DEFAULT_CONFIDENTIALITY_STATEMENT}
            onChange={update('confidentiality_statement')}
          />
        </Field>

        <Field label="Conditions for Discontinuing the Audit">
          <div className="text-[12px] text-inksoft italic mb-2.5">
            Internal working record only — this list does NOT appear in the report. Only if the audit is
            marked discontinued below does a discontinuation statement (with reason) get added to the report.
          </div>
        </Field>
        {DISCONTINUATION_CONDITIONS.map((cond) => (
          <label key={cond.key} className="flex items-start gap-2 text-[12.5px] text-inksoft py-1.5">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={audit.discontinuation_conditions.includes(cond.key)}
              onChange={() => toggleDiscCondition(cond.key)}
            />
            <span>{cond.text}</span>
          </label>
        ))}

        <Field label="">
          <label className="flex items-center gap-2 mt-3.5">
            <input
              type="checkbox"
              checked={audit.discontinued}
              onChange={(e) => setAudit({ ...audit, discontinued: e.target.checked })}
            />
            <span className="normal-case text-sm font-normal">This audit was discontinued</span>
          </label>
        </Field>
        {audit.discontinued && (
          <Field label="Reason / Comment">
            <textarea
              className={inputCls + ' min-h-[56px]'}
              placeholder="Describe the specific circumstances, what was completed before discontinuation, and agreed next steps."
              value={audit.discontinuation_comment}
              onChange={update('discontinuation_comment')}
            />
          </Field>
        )}
      </div>
    </div>
  )
}
