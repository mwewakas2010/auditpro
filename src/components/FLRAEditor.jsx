import { useEffect, useState } from 'react'
import { loadFLRA, saveFLRA, syncPendingFLRAs } from '../lib/flraRepo'
import { listCompanies } from '../lib/companyRepo'
import { saveLocalFLRA, getLocalFLRA, deleteLocalFLRA } from '../lib/offlineStore'
import { useOnlineStatus } from '../lib/useOnlineStatus'
import { signFLRA, loadFLRASignoffs, getSavedSignature, saveSignatureForReuse } from '../lib/signatureRepo'
import { resolveHazardReport, resolveNearMissReport } from '../lib/analyticsRepo'
import { SAFETY_CHECK_ITEMS, FATAL_RISK_CONTROLS, FLRA_INSTRUCTIONS, HIERARCHY_OF_CONTROLS } from '../data/flraContent'
import { generateFLRAPdf } from '../utils/flraPdfExport'
import HazardIcon from './HazardIcon.jsx'
import SignaturePad from './SignaturePad.jsx'

const FATAL_RISKS = Object.keys(FATAL_RISK_CONTROLS)

function emptyMeta() {
  return {
    mode: 'individual',
    employeeName: '',
    employeeIdNumber: '',
    safetyTopic: '',
    departmentArea: '',
    jobTaskDescription: '',
    fatalRisks: [],
    crewMembers: '',
    status: 'in_progress',
  }
}

function emptyHazardRows() {
  return Array.from({ length: 6 }, () => ({ hazardText: '', controlText: '' }))
}

function FLRAStatusBadge({ status }) {
  const style = {
    closed: { bg: '#DCEDE3', text: '#2F6E4E', label: 'Closed' },
    overdue: { bg: '#F3CFC7', text: '#A83A2C', label: 'Overdue' },
    pending: { bg: '#F7EAC9', text: '#96690F', label: 'Pending' },
  }[status] || { bg: '#F2EFE7', text: '#5B5F66', label: status }
  return (
    <span className="text-[9.5px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap" style={{ background: style.bg, color: style.text }}>
      {style.label}
    </span>
  )
}

export default function FLRAEditor({ flraId, organizationId, initialCompanyId, initialAcknowledgedAt, onExit }) {
  const [id, setId] = useState(flraId)
  const [localId, setLocalId] = useState(() => flraId || `local-${crypto.randomUUID()}`)
  const [meta, setMeta] = useState(emptyMeta)
  const [companyId, setCompanyId] = useState(initialCompanyId || null)
  const [companies, setCompanies] = useState([])
  const [hazardRows, setHazardRows] = useState(emptyHazardRows)
  const [safetyChecks, setSafetyChecks] = useState({})
  const [riskControls, setRiskControls] = useState({})
  const [hazardObserved, setHazardObserved] = useState(null) // null | 'yes' | 'no'
  const [hazardReports, setHazardReports] = useState([])
  const [nearMissObserved, setNearMissObserved] = useState(null)
  const [nearMissReports, setNearMissReports] = useState([])
  const [acknowledgedAt] = useState(initialAcknowledgedAt || null)
  const [signoffs, setSignoffs] = useState({ employee: null, supervisor: null })
  const [savedSignature, setSavedSignature] = useState(null)
  const [signingRole, setSigningRole] = useState(null)
  const [signError, setSignError] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [offlineLoaded, setOfflineLoaded] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)

  const online = useOnlineStatus()

  useEffect(() => {
    listCompanies().then(setCompanies).catch(() => {})
    getSavedSignature().then(setSavedSignature).catch(() => {})
  }, [])

  useEffect(() => {
    if (id) loadFLRASignoffs(id).then(setSignoffs).catch(() => {})
  }, [id])

  useEffect(() => {
    ;(async () => {
      try {
        if (flraId) {
          const local = await getLocalFLRA(flraId)
          if (local && local.pendingSync) {
            setMeta(local.instance.meta)
            setCompanyId(local.instance.companyId || null)
            setHazardRows(local.hazardRows)
            setSafetyChecks(local.safetyChecks)
            setRiskControls(local.riskControls || {})
            setHazardReports(local.hazardReports || [])
            setNearMissReports(local.nearMissReports || [])
            setHazardObserved(local.hazardReports?.length ? 'yes' : null)
            setNearMissObserved(local.nearMissReports?.length ? 'yes' : null)
            setOfflineLoaded(true)
            setLoading(false)
            return
          }
          const result = await loadFLRA(flraId)
          const loadedMeta = {
            mode: result.instance.mode,
            employeeName: result.instance.employee_name || '',
            employeeIdNumber: result.instance.employee_id_number || '',
            safetyTopic: result.instance.safety_topic || '',
            departmentArea: result.instance.department_area || '',
            jobTaskDescription: result.instance.job_task_description || '',
            fatalRisks: result.instance.fatal_risks || [],
            crewMembers: result.instance.crew_members || '',
            status: result.instance.status,
          }
          setMeta(loadedMeta)
          setCompanyId(result.instance.company_id || null)
          setHazardRows(result.hazardRows.length ? result.hazardRows.map((r) => ({ hazardText: r.hazard_text, controlText: r.control_text })) : emptyHazardRows())
          setSafetyChecks(result.safetyChecks)
          setRiskControls(result.riskControls)
          setHazardReports(result.hazardReports || [])
          setNearMissReports(result.nearMissReports || [])
          setHazardObserved(result.hazardReports?.length ? 'yes' : null)
          setNearMissObserved(result.nearMissReports?.length ? 'yes' : null)
          await saveLocalFLRA(flraId, {
            instance: { meta: loadedMeta, companyId: result.instance.company_id || null, organizationId, acknowledgedAt: result.instance.acknowledged_at },
            hazardRows: result.hazardRows.map((r) => ({ hazardText: r.hazard_text, controlText: r.control_text })),
            safetyChecks: result.safetyChecks,
            riskControls: result.riskControls,
            hazardReports: result.hazardReports || [],
            nearMissReports: result.nearMissReports || [],
            pendingSync: false,
          })
        }
      } catch (err) {
        if (flraId) {
          const local = await getLocalFLRA(flraId)
          if (local) {
            setMeta(local.instance.meta)
            setCompanyId(local.instance.companyId || null)
            setHazardRows(local.hazardRows)
            setSafetyChecks(local.safetyChecks)
            setRiskControls(local.riskControls || {})
            setHazardReports(local.hazardReports || [])
            setNearMissReports(local.nearMissReports || [])
            setHazardObserved(local.hazardReports?.length ? 'yes' : null)
            setNearMissObserved(local.nearMissReports?.length ? 'yes' : null)
            setOfflineLoaded(true)
          } else {
            setLoadError(err.message)
          }
        }
      }
      setLoading(false)
    })()
  }, [flraId])

  useEffect(() => {
    const t = setTimeout(() => {
      saveLocalFLRA(localId, {
        instance: { meta, companyId, organizationId, acknowledgedAt },
        hazardRows,
        safetyChecks,
        riskControls,
        hazardReports,
        nearMissReports,
        pendingSync: true,
      })
    }, 600)
    return () => clearTimeout(t)
  }, [meta, companyId, hazardRows, safetyChecks, riskControls, hazardReports, nearMissReports, localId])

  useEffect(() => {
    let wasOffline = !online
    if (online && wasOffline) {
      syncPendingFLRAs().then(({ succeeded, failed, total, synced }) => {
        if (total > 0) {
          setSaveMsg(failed > 0 ? `Back online — synced ${succeeded} of ${total} pending FLRA(s), ${failed} failed.` : `Back online — synced ${succeeded} pending FLRA(s).`)
        }
        const match = synced?.find((s) => s.localId === localId)
        if (match) { setId(match.realId); setLocalId(match.realId) }
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online])

  const toggleFatalRisk = (risk) => {
    setMeta((m) => ({
      ...m,
      fatalRisks: m.fatalRisks.includes(risk) ? m.fatalRisks.filter((r) => r !== risk) : [...m.fatalRisks, risk],
    }))
  }

  const updateHazardRow = (index, patch) => {
    setHazardRows((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  }
  const addHazardRow = () => setHazardRows((rows) => [...rows, { hazardText: '', controlText: '' }])

  const updateRiskControl = (fatalRisk, controlKey, controlText, patch) => {
    setRiskControls((prev) => ({
      ...prev,
      [controlKey]: {
        fatalRisk,
        controlText,
        status: null,
        actionText: '',
        responsiblePerson: '',
        dueDate: '',
        addressed: false,
        ...prev[controlKey],
        ...patch,
      },
    }))
  }

  const anySafetyNo = Object.values(safetyChecks).some((v) => v === 'no')

  // Every control belonging to every SELECTED fatal risk must be either
  // in_place, or not_in_place AND marked addressed, before work can proceed.
  const allSelectedControls = meta.fatalRisks.flatMap((risk) => (FATAL_RISK_CONTROLS[risk] || []).map((c) => ({ risk, ...c })))
  const outstandingControls = allSelectedControls.filter((c) => {
    const rc = riskControls[c.key]
    if (!rc || !rc.status) return true // unanswered - still outstanding
    if (rc.status === 'not_in_place' && !rc.addressed) return true
    return false
  })
  const allControlsResolved = allSelectedControls.length === 0 || outstandingControls.length === 0

  const handleSave = async (markFinal) => {
    setSaving(true)
    setSaveMsg('')

    if (markFinal && !allControlsResolved) {
      setSaveMsg(`Error: ${outstandingControls.length} control(s) are still outstanding. Address them before marking this FLRA final.`)
      setSaving(false)
      return
    }

    const newMeta = markFinal ? { ...meta, status: 'final' } : meta

    if (!online) {
      await saveLocalFLRA(localId, { instance: { meta: newMeta, companyId, organizationId, acknowledgedAt }, hazardRows, safetyChecks, riskControls, hazardReports, nearMissReports, pendingSync: true })
      setMeta(newMeta)
      setSaveMsg("📴 Offline — saved on this device. Will sync automatically once you're back online.")
      setSaving(false)
      return
    }

    try {
      const savedId = await saveFLRA({ flraId: id, organizationId, companyId, meta: newMeta, hazardRows, safetyChecks, riskControls, acknowledgedAt, hazardReports, nearMissReports })
      if (localId !== savedId) { await deleteLocalFLRA(localId); setLocalId(savedId) }
      setId(savedId)
      setMeta(newMeta)

      // Refresh hazard/near-miss lists so newly-saved entries pick up
      // their real database IDs - without this, "Mark Resolved" never
      // shows up, since it needs an ID to act on.
      try {
        const refreshed = await loadFLRA(savedId)
        setHazardReports(refreshed.hazardReports || [])
        setNearMissReports(refreshed.nearMissReports || [])
      } catch { /* non-fatal - the save itself already succeeded */ }

      await saveLocalFLRA(savedId, { instance: { meta: newMeta, companyId, organizationId, acknowledgedAt }, hazardRows, safetyChecks, riskControls, hazardReports, nearMissReports, pendingSync: false })
      setSaveMsg('Saved ' + new Date().toLocaleTimeString())
      setOfflineLoaded(false)
    } catch (err) {
      await saveLocalFLRA(localId, { instance: { meta: newMeta, companyId, organizationId, acknowledgedAt }, hazardRows, safetyChecks, riskControls, hazardReports, nearMissReports, pendingSync: true })
      const looksLikeNetworkFailure = !online || err.name === 'TypeError' || /fetch|network/i.test(err.message || '')
      setSaveMsg(
        looksLikeNetworkFailure
          ? "Could not reach the server — saved on this device instead. Will retry automatically once back online."
          : `Error: ${err.message || 'Save was rejected by the server.'} (Your work is still saved on this device.)`
      )
    }
    setSaving(false)
  }

  const handleSign = async (role, sigData) => {
    setSignError('')
    if (!id) { setSignError('Save the FLRA at least once before signing.'); return }
    if (!allControlsResolved) {
      setSignError(`${outstandingControls.length} control(s) are still outstanding. Address them before signing.`)
      return
    }
    try {
      const contentSnapshot = { meta, hazardRows, safetyChecks, riskControls }
      await signFLRA(id, role, {
        signatureImage: sigData.signatureImage,
        signatoryName: sigData.signatoryName,
        consentAccepted: sigData.consentAccepted,
        userAgent: sigData.userAgent,
        contentSnapshot,
      })
      const fresh = await loadFLRASignoffs(id)
      setSignoffs(fresh)
      setSigningRole(null)
    } catch (err) {
      setSignError(err.message)
    }
  }

  if (loading) return <div className="p-9 text-inksoft text-sm">Loading…</div>
  if (loadError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6">
        <div className="text-sm text-major bg-majorbg border border-major rounded p-4 max-w-md text-center">Could not load: {loadError}</div>
        <button onClick={onExit} className="bg-navy text-white px-4 py-2 rounded text-sm font-medium">← Back to FLRAs</button>
      </div>
    )
  }

  const inputCls = 'w-full px-2.5 py-2 border border-line rounded text-sm bg-[#FCFBF8]'
  const company = companies.find((c) => c.id === companyId)

  return (
    <div className="p-4 md:p-9">
      <div className="flex flex-col md:flex-row justify-between md:items-start gap-3 mb-5">
        <div className="flex items-center gap-2.5">
          {company?.logo_url && <img src={company.logo_url} alt="" className="h-9 object-contain" />}
          <h1 className="font-display text-xl font-semibold text-navy">Field Level Risk Assessment</h1>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <button onClick={() => handleSave(false)} disabled={saving} className="bg-navy text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50">
            {saving ? 'Saving…' : 'Save FLRA'}
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={saving || !allControlsResolved}
            title={!allControlsResolved ? `${outstandingControls.length} control(s) still outstanding` : ''}
            className="bg-white text-navy border-[1.5px] border-navy px-4 py-2 rounded text-sm font-medium disabled:opacity-40"
          >
            Mark as Final
          </button>
          {id && (
            <button
              onClick={async () => await generateFLRAPdf({ meta, companyId, companies, hazardRows, safetyChecks, riskControls, signoffs })}
              className="bg-white text-navy border-[1.5px] border-navy px-4 py-2 rounded text-sm font-medium"
            >
              Export PDF
            </button>
          )}
          <div className={`flex items-center gap-1.5 text-[11px] font-medium ${online ? 'text-conform' : 'text-major'}`}>
            <span className={`w-2 h-2 rounded-full ${online ? 'bg-conform' : 'bg-major'}`} />
            {online ? 'Online' : 'Offline'}
          </div>
        </div>
      </div>

      {offlineLoaded && (
        <div className="text-xs mb-3 px-3 py-1.5 rounded bg-minorbg text-minor">
          📴 Showing the last version saved on this device — no connection right now. Your edits will sync once you're back online.
        </div>
      )}
      {saveMsg && (
        <div className={`text-xs mb-4 px-3 py-1.5 rounded ${saveMsg.startsWith('Could not reach') || saveMsg.startsWith('Error') ? 'bg-majorbg text-major' : saveMsg.startsWith('📴') ? 'bg-minorbg text-minor' : 'bg-conformbg text-conform'}`}>
          {saveMsg}
        </div>
      )}

      {/* Collapsible in-form reference: Instructions + Hierarchy of Controls */}
      <details className="bg-white border border-line rounded-md mb-5" open={showInstructions} onToggle={(e) => setShowInstructions(e.target.open)}>
        <summary className="cursor-pointer px-4 py-3 font-display font-semibold text-sm text-navy">
          💡 FLRA Instructions & Hierarchy of Controls (reference)
        </summary>
        <div className="px-4 pb-4">
          <div className="text-xs text-inksoft mb-3">{FLRA_INSTRUCTIONS.intro}</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            {[['WHY?', FLRA_INSTRUCTIONS.why], ['WHO?', FLRA_INSTRUCTIONS.who], ['WHEN?', FLRA_INSTRUCTIONS.when]].map(([label, items]) => (
              <div key={label}>
                <div className="bg-navy text-white text-[11px] font-display font-bold px-2 py-1 rounded-t">{label}</div>
                <ul className="border border-t-0 border-line rounded-b p-2 text-[11px] flex flex-col gap-1">
                  {items.map((s, i) => <li key={i}>• {s}</li>)}
                </ul>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-1">
            {HIERARCHY_OF_CONTROLS.map((h, i) => (
              <div key={h.level} className="flex items-center gap-2 py-1 px-2.5 text-white text-[11px] font-medium rounded" style={{ backgroundColor: h.color, marginLeft: i * 14, marginRight: i * 14 }}>
                <span className="font-display font-bold">{h.level}</span>
                <span className="opacity-90">— {h.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </details>

      {/* Header fields */}
      <div className="bg-white border border-line rounded-md p-4 md:p-5 mb-5">
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setMeta({ ...meta, mode: 'individual' })}
            className={`text-xs px-3 py-1.5 rounded border ${meta.mode === 'individual' ? 'bg-navy text-white border-navy' : 'border-line bg-white'}`}
          >
            Individual
          </button>
          <button
            onClick={() => setMeta({ ...meta, mode: 'group' })}
            className={`text-xs px-3 py-1.5 rounded border ${meta.mode === 'group' ? 'bg-navy text-white border-navy' : 'border-line bg-white'}`}
          >
            Group
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-navy2 mb-1.5 uppercase tracking-wide">Company</label>
            <select className={inputCls} value={companyId || ''} onChange={(e) => setCompanyId(e.target.value || null)}>
              <option value="">No company selected</option>
              {companies.map((co) => <option key={co.id} value={co.id}>{co.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-navy2 mb-1.5 uppercase tracking-wide">
              {meta.mode === 'group' ? 'Employee Name (submitter)' : 'Employee Name'}
            </label>
            <input className={inputCls} value={meta.employeeName} onChange={(e) => setMeta({ ...meta, employeeName: e.target.value })} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-navy2 mb-1.5 uppercase tracking-wide">Employee ID Number</label>
            <input className={inputCls} value={meta.employeeIdNumber} onChange={(e) => setMeta({ ...meta, employeeIdNumber: e.target.value })} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-navy2 mb-1.5 uppercase tracking-wide">Safety Topic of the Day</label>
            <input className={inputCls} value={meta.safetyTopic} onChange={(e) => setMeta({ ...meta, safetyTopic: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-[11px] font-semibold text-navy2 mb-1.5 uppercase tracking-wide">Department / Work Area</label>
            <input className={inputCls} value={meta.departmentArea} onChange={(e) => setMeta({ ...meta, departmentArea: e.target.value })} />
          </div>
        </div>

        {meta.mode === 'group' && (
          <div className="mt-4">
            <label className="block text-[11px] font-semibold text-navy2 mb-1.5 uppercase tracking-wide">Crew Members</label>
            <textarea
              className={inputCls}
              rows={3}
              placeholder="List each crew member's name, one per line"
              value={meta.crewMembers}
              onChange={(e) => setMeta({ ...meta, crewMembers: e.target.value })}
            />
          </div>
        )}
      </div>

      {/* Job/task + Fatal Risks */}
      <div className="bg-white border border-line rounded-md p-4 md:p-5 mb-5">
        <label className="block text-[11px] font-semibold text-navy2 mb-1.5 uppercase tracking-wide">Describe the job/task</label>
        <textarea
          className={inputCls}
          rows={2}
          value={meta.jobTaskDescription}
          onChange={(e) => setMeta({ ...meta, jobTaskDescription: e.target.value })}
        />

        <div className="mt-4">
          <label className="block text-[11px] font-semibold text-navy2 mb-2 uppercase tracking-wide">Select the associated Fatal Risk(s)</label>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
            {FATAL_RISKS.map((risk) => {
              const selected = meta.fatalRisks.includes(risk)
              return (
                <button
                  key={risk}
                  onClick={() => toggleFatalRisk(risk)}
                  className={`flex flex-col items-center gap-1.5 p-2.5 rounded border-2 ${selected ? 'border-gold bg-goldsoft' : 'border-line bg-[#FCFBF8]'}`}
                >
                  <HazardIcon templateName={risk} size={34} />
                  <span className="text-[10px] text-center font-medium leading-tight">{risk}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-4 bg-majorbg/40 border border-major/30 rounded p-2.5 text-[11px] text-major">
          If a critical control is missing for any of the fatal risks identified, the task must NOT be performed until the issue is closed or addressed.
        </div>

        <div className="mt-4">
          <label className="block text-[11px] font-semibold text-navy2 mb-2 uppercase tracking-wide">Hazard / What could go wrong? / Control</label>
          <div className="flex flex-col gap-2">
            {hazardRows.map((row, i) => (
              <div key={i} className="grid grid-cols-1 md:grid-cols-[24px_1fr_1fr] gap-2 items-start">
                <div className="text-xs text-inksoft font-mono mt-2 hidden md:block">{i + 1}.</div>
                <input
                  className={inputCls}
                  placeholder="Hazard / what could go wrong?"
                  value={row.hazardText}
                  onChange={(e) => updateHazardRow(i, { hazardText: e.target.value })}
                />
                <input
                  className={inputCls}
                  placeholder="Control / how did I control the hazard?"
                  value={row.controlText}
                  onChange={(e) => updateHazardRow(i, { controlText: e.target.value })}
                />
              </div>
            ))}
          </div>
          <button onClick={addHazardRow} className="text-xs text-navy2 mt-2 underline">+ Add another row</button>
        </div>
        <div className="text-[10.5px] text-inksoft italic mt-3">If the scope/conditions change, you must complete a new FLRA.</div>
      </div>

      {/* Interactive Fatal Risk Controls Verification */}
      {meta.fatalRisks.length > 0 && (
        <div className="bg-white border border-line rounded-md p-4 md:p-5 mb-5">
          <h3 className="font-display text-[15px] font-semibold text-navy mb-1">Critical Controls Verification</h3>
          <div className="text-[11px] text-inksoft mb-4">
            For each fatal risk selected above, confirm whether every critical control is actually in place.
          </div>

          {meta.fatalRisks.map((risk) => (
            <div key={risk} className="mb-5 last:mb-0">
              <div className="flex items-center gap-2 mb-2">
                <HazardIcon templateName={risk} size={20} />
                <div className="font-display font-semibold text-sm text-navy">{risk}</div>
              </div>
              <div className="border border-line rounded-md overflow-hidden">
                {(FATAL_RISK_CONTROLS[risk] || []).map((c) => {
                  const rc = riskControls[c.key]
                  return (
                    <div key={c.key} className="p-3 border-b border-line last:border-b-0">
                      <div className="flex justify-between items-start gap-3">
                        <div className="text-[13px] flex-1">{c.text}</div>
                        <div className="flex gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => updateRiskControl(risk, c.key, c.text, { status: 'in_place' })}
                            className={`text-xs px-3 py-1.5 rounded border ${rc?.status === 'in_place' ? 'bg-conformbg border-conform text-conform' : 'border-line bg-white'}`}
                          >
                            In Place
                          </button>
                          <button
                            onClick={() => updateRiskControl(risk, c.key, c.text, { status: 'not_in_place' })}
                            className={`text-xs px-3 py-1.5 rounded border ${rc?.status === 'not_in_place' ? 'bg-majorbg border-major text-major' : 'border-line bg-white'}`}
                          >
                            Not in Place
                          </button>
                        </div>
                      </div>

                      {rc?.status === 'not_in_place' && (
                        <div className="mt-3 bg-majorbg/40 border border-major/30 rounded p-3">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 mb-2.5">
                            <div>
                              <label className="block text-[10.5px] font-semibold text-major uppercase tracking-wide mb-1">Action</label>
                              <input
                                className="w-full px-2 py-1.5 border border-line rounded text-xs"
                                value={rc.actionText}
                                onChange={(e) => updateRiskControl(risk, c.key, c.text, { actionText: e.target.value })}
                                placeholder="What needs to be done"
                              />
                            </div>
                            <div>
                              <label className="block text-[10.5px] font-semibold text-major uppercase tracking-wide mb-1">Responsible Person</label>
                              <input
                                className="w-full px-2 py-1.5 border border-line rounded text-xs"
                                value={rc.responsiblePerson}
                                onChange={(e) => updateRiskControl(risk, c.key, c.text, { responsiblePerson: e.target.value })}
                              />
                            </div>
                            <div>
                              <label className="block text-[10.5px] font-semibold text-major uppercase tracking-wide mb-1">Due Date</label>
                              <input
                                type="date"
                                className="w-full px-2 py-1.5 border border-line rounded text-xs"
                                value={rc.dueDate}
                                onChange={(e) => updateRiskControl(risk, c.key, c.text, { dueDate: e.target.value })}
                              />
                            </div>
                          </div>
                          <label className="flex items-center gap-2 text-xs font-medium text-major">
                            <input
                              type="checkbox"
                              checked={!!rc.addressed}
                              onChange={(e) => updateRiskControl(risk, c.key, c.text, { addressed: e.target.checked })}
                            />
                            Issue addressed — work may proceed
                          </label>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Outstanding controls summary + hard block notice */}
      {meta.fatalRisks.length > 0 && !allControlsResolved && (
        <div className="bg-majorbg border-2 border-major rounded-md p-4 mb-5">
          <div className="font-display font-semibold text-major text-sm mb-2">
            ⛔ {outstandingControls.length} outstanding control{outstandingControls.length === 1 ? '' : 's'} — this task must NOT be performed
          </div>
          <ul className="text-xs text-major flex flex-col gap-1">
            {outstandingControls.map((c) => (
              <li key={c.key}>• [{c.risk}] {c.text}</li>
            ))}
          </ul>
          <div className="text-[11px] text-major mt-2 italic">
            Mark each control "In Place" or "Not in Place" and address it before this FLRA can be marked final or signed.
          </div>
        </div>
      )}

      {/* Safety Responsibility Checks */}
      <div className="bg-white border border-line rounded-md p-4 md:p-5 mb-5">
        <h3 className="font-display text-[15px] font-semibold text-navy mb-3">My Safety Responsibility Checks</h3>

        {anySafetyNo && (
          <div className="bg-majorbg border-2 border-major rounded p-3 mb-4 text-major text-sm font-semibold">
            ⚠ STOP! Contact your supervisor immediately. Do not continue until adequate controls have been put in place. Critical Controls must be in place before starting the job.
          </div>
        )}

        <div className="flex flex-col divide-y divide-line">
          {SAFETY_CHECK_ITEMS.map((item) => (
            <div key={item.key} className="py-2.5 flex justify-between items-center gap-3">
              <div className="text-sm flex-1">{item.text}</div>
              <div className="flex gap-1.5 flex-shrink-0">
                {['yes', 'no', 'na'].map((v) => (
                  <button
                    key={v}
                    onClick={() => setSafetyChecks({ ...safetyChecks, [item.key]: v })}
                    className={`text-xs px-2.5 py-1.5 rounded border uppercase ${
                      safetyChecks[item.key] === v
                        ? v === 'yes' ? 'bg-conformbg border-conform text-conform' : v === 'no' ? 'bg-majorbg border-major text-major' : 'bg-nabg border-na text-na'
                        : 'border-line bg-white'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Hazard & Near Miss Reporting */}
      <div className="bg-white border border-line rounded-md p-4 md:p-5 mb-5">
        <h3 className="font-display text-[15px] font-semibold text-navy mb-3">Hazard & Near Miss Reporting</h3>

        <div className="mb-5">
          <label className="block text-[11.5px] font-semibold text-navy2 mb-2 uppercase tracking-wide">Have you observed any hazard?</label>
          <div className="flex gap-2 mb-3">
            {['yes', 'no'].map((v) => (
              <button
                key={v}
                onClick={() => { setHazardObserved(v); if (v === 'no') setHazardReports([]) }}
                className={`text-xs px-3 py-1.5 rounded border uppercase ${hazardObserved === v ? 'bg-navy text-white border-navy' : 'border-line bg-white'}`}
              >
                {v}
              </button>
            ))}
          </div>
          {hazardObserved === 'yes' && (
            <div className="flex flex-col gap-2.5">
              {hazardReports.map((h, i) => (
                <div key={i} className="border border-line rounded-md p-3">
                  <div className="flex justify-between items-start mb-2">
                    <label className="block text-[10px] font-semibold text-navy2 uppercase">Hazard {i + 1}</label>
                    <div className="flex items-center gap-2">
                      {h.status && <FLRAStatusBadge status={h.status} />}
                      <button onClick={() => setHazardReports((rows) => rows.filter((_, idx) => idx !== i))} className="text-xs text-major">✕</button>
                    </div>
                  </div>
                  <textarea
                    className={`${inputCls} mb-2`}
                    rows={2}
                    placeholder="Describe the hazard observed"
                    value={h.text}
                    onChange={(e) => setHazardReports((rows) => rows.map((r, idx) => (idx === i ? { ...r, text: e.target.value } : r)))}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                    <div>
                      <label className="block text-[9.5px] text-inksoft uppercase mb-1">Responsible Person</label>
                      <input
                        className={inputCls}
                        placeholder="Who will resolve this"
                        value={h.responsiblePerson || ''}
                        onChange={(e) => setHazardReports((rows) => rows.map((r, idx) => (idx === i ? { ...r, responsiblePerson: e.target.value } : r)))}
                      />
                    </div>
                    <div>
                      <label className="block text-[9.5px] text-inksoft uppercase mb-1">Expected Resolution Date</label>
                      <input
                        type="date"
                        className={inputCls}
                        value={h.dueDate || ''}
                        onChange={(e) => setHazardReports((rows) => rows.map((r, idx) => (idx === i ? { ...r, dueDate: e.target.value } : r)))}
                      />
                    </div>
                  </div>
                  {h.id && !h.resolved && (
                    <button
                      onClick={async () => { await resolveHazardReport(h.id); setHazardReports((rows) => rows.map((r, idx) => (idx === i ? { ...r, resolved: true, status: 'closed' } : r))) }}
                      className="text-[11px] text-conform border border-conform/40 px-2.5 py-1 rounded"
                    >
                      Mark Resolved
                    </button>
                  )}
                </div>
              ))}
              <button onClick={() => setHazardReports((rows) => [...rows, { text: '', dueDate: '', responsiblePerson: '' }])} className="text-xs text-navy2 underline self-start">
                + Add another hazard
              </button>
            </div>
          )}
        </div>

        <div>
          <label className="block text-[11.5px] font-semibold text-navy2 mb-2 uppercase tracking-wide">Is there a near miss to report?</label>
          <div className="flex gap-2 mb-3">
            {['yes', 'no'].map((v) => (
              <button
                key={v}
                onClick={() => { setNearMissObserved(v); if (v === 'no') setNearMissReports([]) }}
                className={`text-xs px-3 py-1.5 rounded border uppercase ${nearMissObserved === v ? 'bg-navy text-white border-navy' : 'border-line bg-white'}`}
              >
                {v}
              </button>
            ))}
          </div>
          {nearMissObserved === 'yes' && (
            <div className="flex flex-col gap-2.5">
              {nearMissReports.map((n, i) => (
                <div key={i} className="border border-line rounded-md p-3">
                  <div className="flex justify-between items-start mb-2">
                    <label className="block text-[10px] font-semibold text-navy2 uppercase">Near Miss {i + 1}</label>
                    <div className="flex items-center gap-2">
                      {n.status && <FLRAStatusBadge status={n.status} />}
                      <button onClick={() => setNearMissReports((rows) => rows.filter((_, idx) => idx !== i))} className="text-xs text-major">✕</button>
                    </div>
                  </div>
                  <textarea
                    className={`${inputCls} mb-2`}
                    rows={2}
                    placeholder="Describe the near miss"
                    value={n.text}
                    onChange={(e) => setNearMissReports((rows) => rows.map((r, idx) => (idx === i ? { ...r, text: e.target.value } : r)))}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                    <div>
                      <label className="block text-[9.5px] text-inksoft uppercase mb-1">Responsible Person</label>
                      <input
                        className={inputCls}
                        placeholder="Who will resolve this"
                        value={n.responsiblePerson || ''}
                        onChange={(e) => setNearMissReports((rows) => rows.map((r, idx) => (idx === i ? { ...r, responsiblePerson: e.target.value } : r)))}
                      />
                    </div>
                    <div>
                      <label className="block text-[9.5px] text-inksoft uppercase mb-1">Expected Resolution Date</label>
                      <input
                        type="date"
                        className={inputCls}
                        value={n.dueDate || ''}
                        onChange={(e) => setNearMissReports((rows) => rows.map((r, idx) => (idx === i ? { ...r, dueDate: e.target.value } : r)))}
                      />
                    </div>
                  </div>
                  {n.id && !n.resolved && (
                    <button
                      onClick={async () => { await resolveNearMissReport(n.id); setNearMissReports((rows) => rows.map((r, idx) => (idx === i ? { ...r, resolved: true, status: 'closed' } : r))) }}
                      className="text-[11px] text-conform border border-conform/40 px-2.5 py-1 rounded"
                    >
                      Mark Resolved
                    </button>
                  )}
                </div>
              ))}
              <button onClick={() => setNearMissReports((rows) => [...rows, { text: '', dueDate: '', responsiblePerson: '' }])} className="text-xs text-navy2 underline self-start">
                + Add another near miss
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sign-off */}
      <div className="bg-white border border-line rounded-md p-4 md:p-5">
        <h3 className="font-display text-[15px] font-semibold text-navy mb-3">Sign-off</h3>
        {signError && <div className="text-xs text-major bg-majorbg border border-major rounded p-2 mb-3">{signError}</div>}
        {!id && <div className="text-xs text-minor bg-minorbg border border-minor rounded p-2 mb-3">Save the FLRA at least once before signing.</div>}
        {!allControlsResolved && (
          <div className="text-xs text-major bg-majorbg border border-major rounded p-2 mb-3">
            Signing is locked until all outstanding critical controls above are addressed.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {['employee', 'supervisor'].map((role) => (
            <div key={role}>
              <label className="block text-[11.5px] font-semibold text-navy2 mb-1.5 uppercase tracking-wide">
                {role === 'employee' ? (meta.mode === 'group' ? 'Employee (submitter)' : 'Employee') : 'Supervisor'}
              </label>
              {signoffs[role] ? (
                <div className="border-[1.5px] border-solid border-conform bg-white rounded-md p-3">
                  {signoffs[role].signature_image && <img src={signoffs[role].signature_image} alt="Signature" className="h-14 object-contain mb-1" />}
                  <div className="text-xs text-navy font-medium">{signoffs[role].signatory_name}</div>
                  <div className="text-[10.5px] text-inksoft">
                    Signed {new Date(signoffs[role].signed_at).toLocaleString()} • Consent recorded
                  </div>
                </div>
              ) : signingRole === role ? (
                allControlsResolved ? (
                  <SignaturePad
                    signatoryName={role === 'employee' ? meta.employeeName : ''}
                    savedSignature={savedSignature}
                    onSaveForReuse={(img, name) => { saveSignatureForReuse(img, name); setSavedSignature({ signature_image: img, full_name: name }) }}
                    onSign={(sigData) => handleSign(role, sigData)}
                  />
                ) : (
                  <div className="text-xs text-major p-3 border border-major rounded">Resolve all outstanding controls first.</div>
                )
              ) : (
                <div
                  onClick={() => allControlsResolved && setSigningRole(role)}
                  className={`border-[1.5px] border-dashed rounded-md h-[90px] flex items-center justify-center text-xs italic font-display ${
                    allControlsResolved ? 'border-line cursor-pointer bg-[#FCFBF8] text-inksoft' : 'border-major/40 bg-majorbg/30 text-major cursor-not-allowed'
                  }`}
                >
                  {allControlsResolved ? 'Click to sign' : 'Locked — resolve controls first'}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="text-[10.5px] text-inksoft italic mt-3">
          Employee and Supervisor sign on the same device, one after the other.
        </div>
      </div>
    </div>
  )
}
