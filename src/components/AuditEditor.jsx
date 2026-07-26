import { useState, useMemo, useEffect } from 'react'
import { getClauses, getStandardInfo } from '../data/standards'
import { schemeForAuditType } from '../data/schemes'
import { loadAudit, saveAudit } from '../lib/auditRepo'
import AuditSetup from './AuditSetup.jsx'
import Checklist from './Checklist.jsx'
import Findings from './Findings.jsx'
import ReportSignoff from './ReportSignoff.jsx'

const TABS = [
  { key: 'setup', num: '01', label: 'Audit Setup' },
  { key: 'checklist', num: '02', label: 'Checklist' },
  { key: 'findings', num: '03', label: 'Findings' },
  { key: 'report', num: '04', label: 'Conclusion & Sign-off' },
]

function emptyAudit() {
  return {
    client_name: '',
    logo_url: null,
    company_id: null,
    standard: 'ISO 45001:2018',
    department: '',
    department_id: null,
    process_owner: '',
    other_participants: '',
    lead_auditor: '',
    audit_team: '',
    audit_type: 'internal',
    start_date: '',
    end_date: '',
    field_visit_areas: '',
    scope_text: '',
    methodology: ['interviews', 'document_review', 'field_visit'],
    methodology_narrative: '',
    sampling_disclaimer: '',
    confidentiality_statement: '',
    discontinued: false,
    discontinuation_conditions: [],
    discontinuation_comment: '',
    conclusion: 'suitable_effective',
    status: 'in_progress',
  }
}

function emptyScopeFor(clauses) {
  const scope = {}
  clauses.forEach((c) => {
    scope[c.clause_code] = { inScope: true, exclusionReason: '' }
  })
  return scope
}

function emptyChecklistFor(clauses) {
  const entries = {}
  clauses.forEach((c) => {
    entries[c.clause_code] = {
      status: null,
      evidenceText: '',
      evidenceAvailable: null,
      followUp: false,
      thumbs: [],
    }
  })
  return entries
}

export default function AuditEditor({ auditId, onBack }) {
  const [id, setId] = useState(auditId) // becomes set once a new audit is first saved
  const [activeTab, setActiveTab] = useState('setup')
  const [audit, setAudit] = useState(emptyAudit)
  const [scope, setScope] = useState(() => emptyScopeFor(getClauses(emptyAudit().standard)))
  const [checklist, setChecklist] = useState(() => emptyChecklistFor(getClauses(emptyAudit().standard)))
  const [signoffs, setSignoffs] = useState({ lead_auditor: null, auditee_rep: null })
  const [loading, setLoading] = useState(!!auditId)
  const [loadError, setLoadError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  const clauses = useMemo(() => getClauses(audit.standard), [audit.standard])
  const inScopeClauses = useMemo(
    () => clauses.filter((c) => scope?.[c.clause_code]?.inScope !== false),
    [clauses, scope]
  )
  const standardInfo = useMemo(() => getStandardInfo(audit.standard), [audit.standard])

  const handleStandardChange = (newStandard) => {
    if (newStandard === audit.standard) return
    const hasData = Object.values(checklist).some((c) => c.status || c.evidenceText || c.thumbs.length)
    if (hasData && !confirm('Switching standards will reset the clause scope and checklist for this audit. Continue?')) {
      return
    }
    const newClauses = getClauses(newStandard)
    setAudit({ ...audit, standard: newStandard })
    setScope(emptyScopeFor(newClauses))
    setChecklist(emptyChecklistFor(newClauses))
  }

  useEffect(() => {
    if (!auditId) return
    ;(async () => {
      try {
        const result = await loadAudit(auditId)
        setAudit(result.audit)
        setScope(result.scope)
        setChecklist(result.checklist)
        setSignoffs(result.signoffs)
      } catch (err) {
        setLoadError(err.message)
      } finally {
        setLoading(false)
      }
    })()
  }, [auditId])

  const scheme = useMemo(() => schemeForAuditType(audit.audit_type), [audit.audit_type])
  const completedCount = useMemo(
    () => inScopeClauses.filter((c) => checklist[c.clause_code]?.status).length,
    [inScopeClauses, checklist]
  )

  const handleSave = async () => {
    setSaving(true)
    setSaveMsg('')
    try {
      const savedId = await saveAudit({ auditId: id, audit, scope, checklist, signoffs })
      setId(savedId)
      // Reload from the server so uploaded evidence/logo URLs replace local
      // base64 data in state (avoids re-uploading the same file on next save).
      const result = await loadAudit(savedId)
      setAudit(result.audit)
      setScope(result.scope)
      setChecklist(result.checklist)
      setSignoffs(result.signoffs)
      setSaveMsg('Saved ' + new Date().toLocaleTimeString())
    } catch (err) {
      setSaveMsg('Error: ' + err.message)
    }
    setSaving(false)
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-inksoft text-sm">Loading audit…</div>
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6">
        <div className="text-sm text-major bg-majorbg border border-major rounded p-4 max-w-md text-center">
          Could not load this audit: {loadError}
        </div>
        <button onClick={onBack} className="bg-navy text-white px-4 py-2 rounded text-sm font-medium">
          ← Back to My Audits
        </button>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="w-[230px] flex-shrink-0 bg-navy text-slate-100 flex flex-col">
        <div className="px-[22px] pt-[26px] pb-[18px] border-b border-white/10">
          <div className="font-display font-bold text-2xl text-white">AuditPro</div>
          <div className="font-mono text-[10.5px] text-[#9FB0C9] mt-1 uppercase tracking-wide">
            SentinelPro Consultants
          </div>
        </div>
        <div className="py-3.5 flex-1">
          {TABS.map((tab) => (
            <div
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-[22px] py-[13px] text-sm cursor-pointer border-l-[3px] flex items-center gap-2.5 transition-colors ${
                activeTab === tab.key
                  ? 'bg-white/10 border-gold text-white'
                  : 'border-transparent text-[#C7CEDA] hover:bg-white/5'
              }`}
            >
              <span className="font-mono text-[11px] text-[#7E8CA3]">{tab.num}</span> {tab.label}
            </div>
          ))}
        </div>
        <div className="px-[22px] py-4 border-t border-white/10">
          <button onClick={onBack} className="text-[12px] text-[#C7CEDA] hover:text-white mb-3 block">
            ← My Audits
          </button>
          <div className="text-[11.5px] text-[#8493A8]">
            {audit.standard}
            <br />
            Phase 2
          </div>
        </div>
      </div>

      <div className="flex-1 min-w-0 min-h-0 flex flex-col">
        <div className="bg-white border-b border-line px-8 py-4 flex justify-between items-center">
          <div>
            <button
              onClick={onBack}
              className="text-xs text-navy2 border border-line rounded px-2.5 py-1 mb-2 hover:bg-paper inline-block"
            >
              ← My Audits
            </button>
            <div className="font-display font-semibold text-xl">{audit.client_name || 'Untitled Audit'}</div>
            <div className="font-mono text-[11.5px] text-inksoft mt-0.5">
              {audit.department || 'No department set'} • {audit.start_date || 'No date set'}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="font-mono text-[11.5px] text-inksoft">
                {completedCount} of {inScopeClauses.length} clauses complete
              </div>
              <div className="w-40 h-1.5 bg-line rounded-full overflow-hidden mt-1">
                <div
                  className="h-full bg-gold"
                  style={{ width: `${(completedCount / inScopeClauses.length) * 100}%` }}
                />
              </div>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-navy text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save Audit'}
            </button>
          </div>
        </div>
        {saveMsg && (
          <div className={`px-8 py-1.5 text-xs ${saveMsg.startsWith('Error') ? 'bg-majorbg text-major' : 'bg-conformbg text-conform'}`}>
            {saveMsg}
          </div>
        )}

        <div className="p-9 overflow-y-auto flex-1">
          {activeTab === 'setup' && (
            <AuditSetup
              audit={audit}
              setAudit={setAudit}
              scope={scope}
              setScope={setScope}
              clauses={clauses}
              onStandardChange={handleStandardChange}
            />
          )}
          {activeTab === 'checklist' && (
            <Checklist
              scheme={scheme}
              auditType={audit.audit_type}
              checklist={checklist}
              setChecklist={setChecklist}
              clauses={inScopeClauses}
              standardLabel={standardInfo.label}
            />
          )}
          {activeTab === 'findings' && <Findings scheme={scheme} checklist={checklist} clauses={inScopeClauses} />}
          {activeTab === 'report' && (
            <ReportSignoff
              audit={audit}
              setAudit={setAudit}
              signoffs={signoffs}
              setSignoffs={setSignoffs}
              checklist={checklist}
              scope={scope}
              clauses={clauses}
            />
          )}
        </div>
      </div>
    </div>
  )
}
