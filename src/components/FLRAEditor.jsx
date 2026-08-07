import { useEffect, useState } from 'react'
import { loadFLRA, saveFLRA, syncPendingFLRAs } from '../lib/flraRepo'
import { listCompanies } from '../lib/companyRepo'
import { saveLocalFLRA, getLocalFLRA, deleteLocalFLRA } from '../lib/offlineStore'
import { useOnlineStatus } from '../lib/useOnlineStatus'
import { signFLRA, loadFLRASignoffs, getSavedSignature, saveSignatureForReuse } from '../lib/signatureRepo'
import { SAFETY_CHECK_ITEMS, FATAL_RISK_CONTROLS } from '../data/flraContent'
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

export default function FLRAEditor({ flraId, organizationId, onExit }) {
  const [id, setId] = useState(flraId)
  const [localId, setLocalId] = useState(() => flraId || `local-${crypto.randomUUID()}`)
  const [meta, setMeta] = useState(emptyMeta)
  const [companyId, setCompanyId] = useState(null)
  const [companies, setCompanies] = useState([])
  const [hazardRows, setHazardRows] = useState(emptyHazardRows)
  const [safetyChecks, setSafetyChecks] = useState({})
  const [signoffs, setSignoffs] = useState({ employee: null, supervisor: null })
  const [savedSignature, setSavedSignature] = useState(null)
  const [signingRole, setSigningRole] = useState(null)
  const [signError, setSignError] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [offlineLoaded, setOfflineLoaded] = useState(false)

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
          await saveLocalFLRA(flraId, {
            instance: { meta: loadedMeta, companyId: result.instance.company_id || null, organizationId },
            hazardRows: result.hazardRows.map((r) => ({ hazardText: r.hazard_text, controlText: r.control_text })),
            safetyChecks: result.safetyChecks,
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
      saveLocalFLRA(localId, { instance: { meta, companyId, organizationId }, hazardRows, safetyChecks, pendingSync: true })
    }, 600)
    return () => clearTimeout(t)
  }, [meta, companyId, hazardRows, safetyChecks, localId])

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

  const anyNo = Object.values(safetyChecks).some((v) => v === 'no')

  const handleSave = async (markFinal) => {
    setSaving(true)
    setSaveMsg('')
    const newMeta = markFinal ? { ...meta, status: 'final' } : meta

    if (!online) {
      await saveLocalFLRA(localId, { instance: { meta: newMeta, companyId, organizationId }, hazardRows, safetyChecks, pendingSync: true })
      setMeta(newMeta)
      setSaveMsg("📴 Offline — saved on this device. Will sync automatically once you're back online.")
      setSaving(false)
      return
    }

    try {
      const savedId = await saveFLRA({ flraId: id, organizationId, companyId, meta: newMeta, hazardRows, safetyChecks })
      if (localId !== savedId) { await deleteLocalFLRA(localId); setLocalId(savedId) }
      setId(savedId)
      setMeta(newMeta)
      await saveLocalFLRA(savedId, { instance: { meta: newMeta, companyId, organizationId }, hazardRows, safetyChecks, pendingSync: false })
      setSaveMsg('Saved ' + new Date().toLocaleTimeString())
      setOfflineLoaded(false)
    } catch (err) {
      await saveLocalFLRA(localId, { instance: { meta: newMeta, companyId, organizationId }, hazardRows, safetyChecks, pendingSync: true })
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
    try {
      const contentSnapshot = { meta, hazardRows, safetyChecks }
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

  return (
    <div className="p-4 md:p-9">
      <div className="flex flex-col md:flex-row justify-between md:items-start gap-3 mb-5">
        <h1 className="font-display text-xl font-semibold text-navy">Field Level Risk Assessment</h1>
        <div className="flex gap-2 flex-wrap items-center">
          <button onClick={() => handleSave(false)} disabled={saving} className="bg-navy text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50">
            {saving ? 'Saving…' : 'Save FLRA'}
          </button>
          <button onClick={() => handleSave(true)} disabled={saving} className="bg-white text-navy border-[1.5px] border-navy px-4 py-2 rounded text-sm font-medium">
            Mark as Final
          </button>
          {id && (
            <button
              onClick={async () => await generateFLRAPdf({ meta, companyId, companies, hazardRows, safetyChecks, signoffs })}
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

          {meta.fatalRisks.length > 0 && (
            <div className="mt-3 flex flex-col gap-1.5">
              {meta.fatalRisks.map((risk) => (
                <details key={risk} className="text-[11.5px] border border-line rounded p-2">
                  <summary className="text-gold cursor-pointer font-medium">
                    💡 {risk} — critical controls to check
                  </summary>
                  <ul className="mt-1.5 pl-4 list-disc text-inksoft space-y-0.5">
                    {(FATAL_RISK_CONTROLS[risk] || []).map((c, i) => <li key={i}>{c}</li>)}
                  </ul>
                </details>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 bg-majorbg/40 border border-major/30 rounded p-2.5 text-[11px] text-major">
          If a critical control is missing for any of the fatal risks identified, you have the responsibility to STOP Unsafe Work and report this to your Supervisor.
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

      {/* Safety Responsibility Checks */}
      <div className="bg-white border border-line rounded-md p-4 md:p-5 mb-5">
        <h3 className="font-display text-[15px] font-semibold text-navy mb-3">My Safety Responsibility Checks</h3>

        {anyNo && (
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

      {/* Sign-off */}
      <div className="bg-white border border-line rounded-md p-4 md:p-5">
        <h3 className="font-display text-[15px] font-semibold text-navy mb-3">Sign-off</h3>
        {signError && <div className="text-xs text-major bg-majorbg border border-major rounded p-2 mb-3">{signError}</div>}
        {!id && <div className="text-xs text-minor bg-minorbg border border-minor rounded p-2 mb-3">Save the FLRA at least once before signing.</div>}

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
                <SignaturePad
                  signatoryName={role === 'employee' ? meta.employeeName : ''}
                  savedSignature={savedSignature}
                  onSaveForReuse={(img, name) => { saveSignatureForReuse(img, name); setSavedSignature({ signature_image: img, full_name: name }) }}
                  onSign={(sigData) => handleSign(role, sigData)}
                />
              ) : (
                <div
                  onClick={() => setSigningRole(role)}
                  className="border-[1.5px] border-dashed border-line rounded-md h-[90px] flex items-center justify-center cursor-pointer bg-[#FCFBF8] text-inksoft text-xs italic font-display"
                >
                  Click to sign
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
