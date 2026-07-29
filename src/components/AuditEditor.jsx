import { useState, useMemo, useEffect, useRef } from 'react'
import { getClauses, getStandardInfo } from '../data/standards'
import { schemeForAuditType } from '../data/schemes'
import { loadAudit, saveAudit, syncPendingAudits } from '../lib/auditRepo'
import { saveLocalAudit, getLocalAudit, deleteLocalAudit } from '../lib/offlineStore'
import { useOnlineStatus } from '../lib/useOnlineStatus'
import AuditSetup from './AuditSetup.jsx'
import Checklist from './Checklist.jsx'
import Findings from './Findings.jsx'
import ReportSignoff from './ReportSignoff.jsx'

export const AUDIT_TABS = [
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

export default function AuditEditor({ auditId, activeTab, onExit, onAuditSaved, mode = 'consultant', organizationId = null, reportBrandName = null }) {
  const [id, setId] = useState(auditId) // becomes set once a new audit is first saved
  // Stable local storage key: the real audit id if editing an existing one,
  // or a fresh "local-..." id for a brand-new audit that has never touched
  // the server yet. This is what offline edits get queued under.
  const [localId, setLocalId] = useState(() => auditId || `local-${crypto.randomUUID()}`)
  const [audit, setAudit] = useState(() => {
    const base = emptyAudit()
    if (mode === 'subscriber' && !auditId && reportBrandName) {
      base.client_name = reportBrandName
    }
    return base
  })
  const [scope, setScope] = useState(() => emptyScopeFor(getClauses(emptyAudit().standard)))
  const [checklist, setChecklist] = useState(() => emptyChecklistFor(getClauses(emptyAudit().standard)))
  const [signoffs, setSignoffs] = useState({ lead_auditor: null, auditee_rep: null })
  const [loading, setLoading] = useState(!!auditId)
  const [loadError, setLoadError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [offlineLoaded, setOfflineLoaded] = useState(false) // true if we loaded from local cache, not the server

  const online = useOnlineStatus()
  const hasInitiallyLoaded = useRef(false)
  const wasOffline = useRef(!online)

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

  // ---- Load: prefer unsynced local edits over the server copy ----
  useEffect(() => {
    if (!auditId) {
      setLoading(false)
      return
    }
    ;(async () => {
      try {
        const local = await getLocalAudit(auditId)
        if (local && local.pendingSync) {
          // There are offline edits for this audit that haven't reached the
          // server yet - use those rather than risk overwriting them with
          // (now stale) server data.
          setAudit(local.audit)
          setScope(local.scope)
          setChecklist(local.checklist)
          setSignoffs(local.signoffs)
          setOfflineLoaded(true)
          setLoading(false)
          return
        }
        const result = await loadAudit(auditId)
        setAudit(result.audit)
        setScope(result.scope)
        setChecklist(result.checklist)
        setSignoffs(result.signoffs)
        // Cache a non-pending copy so this audit can still be opened (and
        // edited offline) even with zero signal next time.
        await saveLocalAudit(auditId, { audit: result.audit, scope: result.scope, checklist: result.checklist, signoffs: result.signoffs, pendingSync: false, organizationId })
      } catch (err) {
        // Network load failed - last resort, fall back to any local cache
        // (even a non-pending one) so the audit is still viewable offline.
        const local = await getLocalAudit(auditId)
        if (local) {
          setAudit(local.audit)
          setScope(local.scope)
          setChecklist(local.checklist)
          setSignoffs(local.signoffs)
          setOfflineLoaded(true)
        } else {
          setLoadError(err.message)
        }
      } finally {
        setLoading(false)
        hasInitiallyLoaded.current = true
      }
    })()
  }, [auditId])

  useEffect(() => {
    if (!auditId) hasInitiallyLoaded.current = true
  }, [auditId])

  // ---- Auto-save to local storage on every change, as a safety net ----
  useEffect(() => {
    if (!hasInitiallyLoaded.current) return
    const t = setTimeout(() => {
      saveLocalAudit(localId, { audit, scope, checklist, signoffs, pendingSync: true, organizationId })
    }, 600)
    return () => clearTimeout(t)
  }, [audit, scope, checklist, signoffs, localId])

  // ---- Sync automatically the moment connectivity returns ----
  useEffect(() => {
    if (online && wasOffline.current) {
      syncPendingAudits().then(({ succeeded, failed, total, synced }) => {
        if (total > 0) {
          setSaveMsg(
            failed > 0
              ? `Back online — synced ${succeeded} of ${total} pending audit(s), ${failed} failed.`
              : `Back online — synced ${succeeded} pending audit(s).`
          )
        }
        // If the audit currently open in this editor was one of the ones
        // just synced in the background, adopt its new real server id so
        // the next manual save updates it instead of inserting a duplicate.
        const match = synced?.find((s) => s.localId === localId)
        if (match) {
          setId(match.realId)
          setLocalId(match.realId)
          onAuditSaved?.(match.realId)
        }
      })
    }
    wasOffline.current = !online
  }, [online])

  const scheme = useMemo(() => schemeForAuditType(audit.audit_type), [audit.audit_type])
  const completedCount = useMemo(
    () => inScopeClauses.filter((c) => checklist[c.clause_code]?.status).length,
    [inScopeClauses, checklist]
  )

  const handleSave = async () => {
    setSaving(true)
    setSaveMsg('')

    if (!online) {
      // Offline: don't even attempt the network call - just make sure the
      // local safety-net copy is current and clearly marked as pending.
      await saveLocalAudit(localId, { audit, scope, checklist, signoffs, pendingSync: true, organizationId })
      setSaveMsg('📴 Offline — saved on this device. Will sync automatically once you\'re back online.')
      setSaving(false)
      return
    }

    try {
      const savedId = await saveAudit({ auditId: id, audit, scope, checklist, signoffs, organizationId })
      // If this was a brand-new audit (previously only a local-... id),
      // migrate the local cache entry to the real server id.
      if (localId !== savedId) {
        await deleteLocalAudit(localId)
        setLocalId(savedId)
      }
      setId(savedId)
      onAuditSaved?.(savedId)
      // Reload from the server so uploaded evidence/logo URLs replace local
      // base64 data in state (avoids re-uploading the same file on next save).
      const result = await loadAudit(savedId)
      setAudit(result.audit)
      setScope(result.scope)
      setChecklist(result.checklist)
      setSignoffs(result.signoffs)
      await saveLocalAudit(savedId, { audit: result.audit, scope: result.scope, checklist: result.checklist, signoffs: result.signoffs, pendingSync: false, organizationId })
      setSaveMsg('Saved ' + new Date().toLocaleTimeString())
      setOfflineLoaded(false)
    } catch (err) {
      // Always keep the local safety-net copy either way - never lose work.
      await saveLocalAudit(localId, { audit, scope, checklist, signoffs, pendingSync: true, organizationId })

      const looksLikeNetworkFailure =
        !online ||
        err.name === 'TypeError' ||
        /fetch|network/i.test(err.message || '')

      if (looksLikeNetworkFailure) {
        setSaveMsg('Could not reach the server — saved on this device instead. Will retry automatically once back online.')
      } else {
        // A real error came back from the server (permissions, invalid data,
        // etc.) - show it plainly rather than mislabeling it as offline.
        // The local copy is still safe, but this needs actual attention.
        setSaveMsg(`Error: ${err.message || 'Save was rejected by the server.'} (Your work is still saved on this device.)`)
      }
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
        <button onClick={onExit} className="bg-navy text-white px-4 py-2 rounded text-sm font-medium">
          ← Back to My Audits
        </button>
      </div>
    )
  }

  return (
    <div className="flex-1 min-w-0 min-h-0 flex flex-col h-full overflow-hidden">
      <div className="bg-white border-b border-line px-4 md:px-8 py-3 md:py-4 flex flex-col md:flex-row justify-between md:items-center gap-3">
        <div>
          <div className="font-display font-semibold text-lg md:text-xl">{audit.client_name || 'Untitled Audit'}</div>
          <div className="font-mono text-[11px] md:text-[11.5px] text-inksoft mt-0.5">
            {audit.standard} • {audit.department || 'No department set'} • {audit.start_date || 'No date set'}
          </div>
        </div>
        <div className="flex items-center justify-between md:justify-end gap-3 md:gap-4">
          <div className="text-left md:text-right">
            <div className="font-mono text-[11px] md:text-[11.5px] text-inksoft">
              {completedCount} of {inScopeClauses.length} clauses complete
            </div>
            <div className="w-28 md:w-40 h-1.5 bg-line rounded-full overflow-hidden mt-1">
              <div
                className="h-full bg-gold"
                style={{ width: `${(completedCount / inScopeClauses.length) * 100}%` }}
              />
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-navy text-white px-4 py-2.5 md:py-2 rounded text-sm font-medium disabled:opacity-50 flex-shrink-0"
          >
            {saving ? 'Saving…' : 'Save Audit'}
          </button>
          <div className={`flex items-center gap-1.5 text-[11px] font-medium flex-shrink-0 ${online ? 'text-conform' : 'text-major'}`}>
            <span className={`w-2 h-2 rounded-full ${online ? 'bg-conform' : 'bg-major'}`} />
            {online ? 'Online' : 'Offline'}
          </div>
        </div>
      </div>
      {offlineLoaded && (
        <div className="px-4 md:px-8 py-1.5 text-xs bg-minorbg text-minor">
          📴 Showing the last version saved on this device — no connection right now. Your edits will sync once you're back online.
        </div>
      )}
      {saveMsg && (
        <div
          className={`px-4 md:px-8 py-1.5 text-xs ${
            saveMsg.startsWith('Could not reach') || saveMsg.startsWith('Error')
              ? 'bg-majorbg text-major'
              : saveMsg.startsWith('📴')
              ? 'bg-minorbg text-minor'
              : 'bg-conformbg text-conform'
          }`}
        >
          {saveMsg}
        </div>
      )}

      <div className="p-4 md:p-9 overflow-y-auto flex-1">
        {activeTab === 'setup' && (
          <AuditSetup
            audit={audit}
            setAudit={setAudit}
            scope={scope}
            setScope={setScope}
            clauses={clauses}
            onStandardChange={handleStandardChange}
            mode={mode}
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
            reportBrandName={reportBrandName}
          />
        )}
      </div>
    </div>
  )
}
