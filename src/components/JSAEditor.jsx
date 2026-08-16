import { useEffect, useState } from 'react'
import { loadJSA, saveJSA, syncPendingJSAs } from '../lib/jsaRepo'
import { listCompanies } from '../lib/companyRepo'
import { saveLocalJSA, getLocalJSA, deleteLocalJSA } from '../lib/offlineStore'
import { useOnlineStatus } from '../lib/useOnlineStatus'
import {
  signJSATeamMember, signJSASupervisor, loadJSASignoffs,
  signJSADailyReview, loadJSADailyReviews,
  getSavedSignature, saveSignatureForReuse,
} from '../lib/signatureRepo'
import {
  PERMIT_TYPES, SUPPORTING_DOCUMENTS, JSA_FATAL_RISKS, POTENTIAL_HAZARDS,
  CONTROL_HIERARCHY, LIKELIHOOD_LEVELS, CONSEQUENCE_LEVELS, riskBand, HAZARD_CONTROL_REFERENCE,
} from '../data/jsaContent'
import { generateJSAPdf } from '../utils/jsaPdfExport'
import HazardIcon from './HazardIcon.jsx'
import SignaturePad from './SignaturePad.jsx'

function emptyMeta() {
  return {
    jsaNo: '', workOrderNo: '', jobTask: '', plantArea: '', location: '', jsaDate: '',
    seniorSupervisorName: '', workGroupSupervisorName: '',
    permitsRequired: [], additionalPpe: '', specialTools: '',
    fatalRisks: [], hazardousMaterials: '', fireEmergencyEquipment: '',
    supportingDocuments: [], canBecomeSop: '', potentialHazards: [],
    validFrom: '', validUntil: '', status: 'in_progress',
  }
}

function emptySteps() {
  return Array.from({ length: 6 }, () => ({
    jobStep: '', jobStepHazard: '', currentControls: '', controlHierarchy: null,
    likelihood: null, consequence: null, requiredAdditionalActions: '',
    residualLikelihood: null, residualConsequence: null,
  }))
}

function toggleInArray(arr, val) {
  return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]
}

function daysBetween(a, b) {
  if (!a || !b) return 0
  return Math.round((new Date(b) - new Date(a)) / (1000 * 60 * 60 * 24))
}

export default function JSAEditor({ jsaId, organizationId, onExit }) {
  const [id, setId] = useState(jsaId)
  const [localId, setLocalId] = useState(() => jsaId || `local-${crypto.randomUUID()}`)
  const [meta, setMeta] = useState(emptyMeta)
  const [companyId, setCompanyId] = useState(null)
  const [companies, setCompanies] = useState([])
  const [steps, setSteps] = useState(emptySteps)
  const [signoffs, setSignoffs] = useState([])
  const [dailyReviews, setDailyReviews] = useState([])
  const [savedSignature, setSavedSignature] = useState(null)
  const [signing, setSigning] = useState(null) // { kind: 'team'|'senior'|'workgroup'|'daily', date? }
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
    if (id) {
      loadJSASignoffs(id).then(setSignoffs).catch(() => {})
      loadJSADailyReviews(id).then(setDailyReviews).catch(() => {})
    }
  }, [id])

  useEffect(() => {
    ;(async () => {
      try {
        if (jsaId) {
          const local = await getLocalJSA(jsaId)
          if (local && local.pendingSync) {
            setMeta(local.instance.meta)
            setCompanyId(local.instance.companyId || null)
            setSteps(local.steps)
            setOfflineLoaded(true)
            setLoading(false)
            return
          }
          const result = await loadJSA(jsaId)
          const loadedMeta = {
            jsaNo: result.instance.jsa_no || '',
            workOrderNo: result.instance.work_order_no || '',
            jobTask: result.instance.job_task || '',
            plantArea: result.instance.plant_area || '',
            location: result.instance.location || '',
            jsaDate: result.instance.jsa_date || '',
            seniorSupervisorName: result.instance.senior_supervisor_name || '',
            workGroupSupervisorName: result.instance.work_group_supervisor_name || '',
            permitsRequired: result.instance.permits_required || [],
            additionalPpe: result.instance.additional_ppe || '',
            specialTools: result.instance.special_tools || '',
            fatalRisks: result.instance.fatal_risks || [],
            hazardousMaterials: result.instance.hazardous_materials || '',
            fireEmergencyEquipment: result.instance.fire_emergency_equipment || '',
            supportingDocuments: result.instance.supporting_documents || [],
            canBecomeSop: result.instance.can_become_sop || '',
            potentialHazards: result.instance.potential_hazards || [],
            validFrom: result.instance.valid_from || '',
            validUntil: result.instance.valid_until || '',
            status: result.instance.status,
          }
          setMeta(loadedMeta)
          setCompanyId(result.instance.company_id || null)
          setSteps(result.steps.length ? result.steps.map((s) => ({
            jobStep: s.job_step, jobStepHazard: s.job_step_hazard, currentControls: s.current_controls,
            controlHierarchy: s.control_hierarchy, likelihood: s.likelihood, consequence: s.consequence,
            requiredAdditionalActions: s.required_additional_actions,
            residualLikelihood: s.residual_likelihood, residualConsequence: s.residual_consequence,
          })) : emptySteps())
          await saveLocalJSA(jsaId, {
            instance: { meta: loadedMeta, companyId: result.instance.company_id || null, organizationId },
            steps: result.steps.map((s) => ({
              jobStep: s.job_step, jobStepHazard: s.job_step_hazard, currentControls: s.current_controls,
              controlHierarchy: s.control_hierarchy, likelihood: s.likelihood, consequence: s.consequence,
              requiredAdditionalActions: s.required_additional_actions,
              residualLikelihood: s.residual_likelihood, residualConsequence: s.residual_consequence,
            })),
            pendingSync: false,
          })
        }
      } catch (err) {
        if (jsaId) {
          const local = await getLocalJSA(jsaId)
          if (local) {
            setMeta(local.instance.meta)
            setCompanyId(local.instance.companyId || null)
            setSteps(local.steps)
            setOfflineLoaded(true)
          } else {
            setLoadError(err.message)
          }
        }
      }
      setLoading(false)
    })()
  }, [jsaId])

  useEffect(() => {
    const t = setTimeout(() => {
      saveLocalJSA(localId, { instance: { meta, companyId, organizationId }, steps, pendingSync: true })
    }, 600)
    return () => clearTimeout(t)
  }, [meta, companyId, steps, localId])

  useEffect(() => {
    let wasOffline = !online
    if (online && wasOffline) {
      syncPendingJSAs().then(({ succeeded, failed, total, synced }) => {
        if (total > 0) {
          setSaveMsg(failed > 0 ? `Back online — synced ${succeeded} of ${total} pending JSA(s), ${failed} failed.` : `Back online — synced ${succeeded} pending JSA(s).`)
        }
        const match = synced?.find((s) => s.localId === localId)
        if (match) { setId(match.realId); setLocalId(match.realId) }
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online])

  const updateStep = (index, patch) => {
    setSteps((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  }
  const addStep = () => setSteps((rows) => [...rows, { jobStep: '', jobStepHazard: '', currentControls: '', controlHierarchy: null, likelihood: null, consequence: null, requiredAdditionalActions: '', residualLikelihood: null, residualConsequence: null }])

  const validityDays = daysBetween(meta.validFrom, meta.validUntil)
  const isMultiDay = validityDays > 0

  const handleSave = async (markFinal) => {
    setSaving(true)
    setSaveMsg('')
    const newMeta = markFinal ? { ...meta, status: 'final' } : meta

    if (!online) {
      await saveLocalJSA(localId, { instance: { meta: newMeta, companyId, organizationId }, steps, pendingSync: true })
      setMeta(newMeta)
      setSaveMsg("📴 Offline — saved on this device. Will sync automatically once you're back online.")
      setSaving(false)
      return
    }

    try {
      const savedId = await saveJSA({ jsaId: id, organizationId, companyId, meta: newMeta, steps })
      if (localId !== savedId) { await deleteLocalJSA(localId); setLocalId(savedId) }
      setId(savedId)
      setMeta(newMeta)
      await saveLocalJSA(savedId, { instance: { meta: newMeta, companyId, organizationId }, steps, pendingSync: false })
      setSaveMsg('Saved ' + new Date().toLocaleTimeString())
      setOfflineLoaded(false)
    } catch (err) {
      await saveLocalJSA(localId, { instance: { meta: newMeta, companyId, organizationId }, steps, pendingSync: true })
      const looksLikeNetworkFailure = !online || err.name === 'TypeError' || /fetch|network/i.test(err.message || '')
      setSaveMsg(
        looksLikeNetworkFailure
          ? "Could not reach the server — saved on this device instead. Will retry automatically once back online."
          : `Error: ${err.message || 'Save was rejected by the server.'} (Your work is still saved on this device.)`
      )
    }
    setSaving(false)
  }

  const contentSnapshot = () => ({ meta, steps })

  const handleSignTeamMember = async (sigData) => {
    setSignError('')
    if (!id) { setSignError('Save the JSA at least once before signing.'); return }
    try {
      await signJSATeamMember(id, {
        signatureImage: sigData.signatureImage,
        signatoryName: sigData.signatoryName,
        employeeIdNo: sigData.employeeIdNo,
        consentAccepted: sigData.consentAccepted,
        userAgent: sigData.userAgent,
        contentSnapshot: contentSnapshot(),
      })
      setSignoffs(await loadJSASignoffs(id))
      setSigning(null)
    } catch (err) {
      setSignError(err.message)
    }
  }

  const handleSignSupervisor = async (role, sigData) => {
    setSignError('')
    if (!id) { setSignError('Save the JSA at least once before signing.'); return }
    try {
      await signJSASupervisor(id, role, {
        signatureImage: sigData.signatureImage,
        signatoryName: sigData.signatoryName,
        employeeIdNo: sigData.employeeIdNo,
        consentAccepted: sigData.consentAccepted,
        userAgent: sigData.userAgent,
        contentSnapshot: contentSnapshot(),
      })
      setSignoffs(await loadJSASignoffs(id))
      setSigning(null)
    } catch (err) {
      setSignError(err.message)
    }
  }

  const handleSignDailyReview = async (reviewDate, sigData) => {
    setSignError('')
    if (!id) { setSignError('Save the JSA at least once before signing.'); return }
    try {
      await signJSADailyReview(id, reviewDate, {
        signatureImage: sigData.signatureImage,
        signatoryName: sigData.signatoryName,
        employeeIdNo: sigData.employeeIdNo,
        consentAccepted: sigData.consentAccepted,
        userAgent: sigData.userAgent,
        contentSnapshot: contentSnapshot(),
      })
      setDailyReviews(await loadJSADailyReviews(id))
      setSigning(null)
    } catch (err) {
      setSignError(err.message)
    }
  }

  if (loading) return <div className="p-9 text-inksoft text-sm">Loading…</div>
  if (loadError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6">
        <div className="text-sm text-major bg-majorbg border border-major rounded p-4 max-w-md text-center">Could not load: {loadError}</div>
        <button onClick={onExit} className="bg-navy text-white px-4 py-2 rounded text-sm font-medium">← Back to JSAs</button>
      </div>
    )
  }

  const inputCls = 'w-full px-2.5 py-2 border border-line rounded text-sm bg-[#FCFBF8]'
  const company = companies.find((c) => c.id === companyId)
  const teamSignoffs = signoffs.filter((s) => s.role === 'team_member')
  const seniorSupervisorSignoff = signoffs.find((s) => s.role === 'senior_supervisor')
  const workGroupSupervisorSignoff = signoffs.find((s) => s.role === 'work_group_supervisor')

  return (
    <div className="p-4 md:p-9">
      <div className="flex flex-col md:flex-row justify-between md:items-start gap-3 mb-5">
        <div className="flex items-center gap-2.5">
          {company?.logo_url && <img src={company.logo_url} alt="" className="h-9 object-contain" />}
          <h1 className="font-display text-xl font-semibold text-navy">Job Safety Analysis</h1>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <button onClick={() => handleSave(false)} disabled={saving} className="bg-navy text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50">
            {saving ? 'Saving…' : 'Save JSA'}
          </button>
          <button onClick={() => handleSave(true)} disabled={saving} className="bg-white text-navy border-[1.5px] border-navy px-4 py-2 rounded text-sm font-medium">
            Mark as Final
          </button>
          {id && (
            <button
              onClick={async () => await generateJSAPdf({ meta, companyId, companies, steps, signoffs, dailyReviews })}
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

      {/* JSA Summary header */}
      <details className="bg-white border border-line rounded-md border-t-4 border-t-navy mb-5">
        <summary className="cursor-pointer px-4 md:px-5 py-3 font-display text-[15px] font-semibold text-navy list-none flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-navy flex-shrink-0"></span>JSA Summary</summary>
        <div className="px-4 md:px-5 pb-4 md:pb-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-navy2 mb-1.5 uppercase tracking-wide">Company</label>
            <select className={inputCls} value={companyId || ''} onChange={(e) => setCompanyId(e.target.value || null)}>
              <option value="">No company selected</option>
              {companies.map((co) => <option key={co.id} value={co.id}>{co.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-navy2 mb-1.5 uppercase tracking-wide">JSA No.</label>
            <input className={inputCls} value={meta.jsaNo} onChange={(e) => setMeta({ ...meta, jsaNo: e.target.value })} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-navy2 mb-1.5 uppercase tracking-wide">Work Order No.</label>
            <input className={inputCls} value={meta.workOrderNo} onChange={(e) => setMeta({ ...meta, workOrderNo: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-[11px] font-semibold text-navy2 mb-1.5 uppercase tracking-wide">Job/Task</label>
            <input className={inputCls} value={meta.jobTask} onChange={(e) => setMeta({ ...meta, jobTask: e.target.value })} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-navy2 mb-1.5 uppercase tracking-wide">Plant/Area</label>
            <input className={inputCls} value={meta.plantArea} onChange={(e) => setMeta({ ...meta, plantArea: e.target.value })} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-navy2 mb-1.5 uppercase tracking-wide">Location</label>
            <input className={inputCls} value={meta.location} onChange={(e) => setMeta({ ...meta, location: e.target.value })} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-navy2 mb-1.5 uppercase tracking-wide">Date</label>
            <input type="date" className={inputCls} value={meta.jsaDate} onChange={(e) => setMeta({ ...meta, jsaDate: e.target.value })} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-navy2 mb-1.5 uppercase tracking-wide">Senior Supervisor's Name</label>
            <input className={inputCls} value={meta.seniorSupervisorName} onChange={(e) => setMeta({ ...meta, seniorSupervisorName: e.target.value })} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-navy2 mb-1.5 uppercase tracking-wide">Work Group Supervisor's Name</label>
            <input className={inputCls} value={meta.workGroupSupervisorName} onChange={(e) => setMeta({ ...meta, workGroupSupervisorName: e.target.value })} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-navy2 mb-1.5 uppercase tracking-wide">Valid From</label>
            <input type="date" className={inputCls} value={meta.validFrom} onChange={(e) => setMeta({ ...meta, validFrom: e.target.value })} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-navy2 mb-1.5 uppercase tracking-wide">Valid Until (max 14 days)</label>
            <input type="date" className={inputCls} value={meta.validUntil} onChange={(e) => setMeta({ ...meta, validUntil: e.target.value })} />
            {validityDays > 14 && <div className="text-[10.5px] text-major mt-1">Exceeds 14-day maximum validity period.</div>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-[11px] font-semibold text-navy2 mb-1.5 uppercase tracking-wide">Additional PPE Requirements</label>
            <textarea className={inputCls} rows={2} value={meta.additionalPpe} onChange={(e) => setMeta({ ...meta, additionalPpe: e.target.value })} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-navy2 mb-1.5 uppercase tracking-wide">Special Tools or Equipment Required</label>
            <textarea className={inputCls} rows={2} value={meta.specialTools} onChange={(e) => setMeta({ ...meta, specialTools: e.target.value })} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-navy2 mb-1.5 uppercase tracking-wide">Hazardous Materials (attach SDS)</label>
            <textarea className={inputCls} rows={2} value={meta.hazardousMaterials} onChange={(e) => setMeta({ ...meta, hazardousMaterials: e.target.value })} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-navy2 mb-1.5 uppercase tracking-wide">Fire/Emergency Equipment Requirements</label>
            <textarea className={inputCls} rows={2} value={meta.fireEmergencyEquipment} onChange={(e) => setMeta({ ...meta, fireEmergencyEquipment: e.target.value })} />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-[11px] font-semibold text-navy2 mb-2 uppercase tracking-wide">Type of Permit Required</label>
          <div className="flex flex-wrap gap-2">
            {PERMIT_TYPES.map((p) => (
              <button key={p} onClick={() => setMeta({ ...meta, permitsRequired: toggleInArray(meta.permitsRequired, p) })}
                className={`text-xs px-2.5 py-1.5 rounded border ${meta.permitsRequired.includes(p) ? 'bg-navy text-white border-navy' : 'border-line bg-white'}`}>
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-[11px] font-semibold text-navy2 mb-2 uppercase tracking-wide">Supporting Documents</label>
          <div className="flex flex-wrap gap-2">
            {SUPPORTING_DOCUMENTS.map((d) => (
              <button key={d} onClick={() => setMeta({ ...meta, supportingDocuments: toggleInArray(meta.supportingDocuments, d) })}
                className={`text-xs px-2.5 py-1.5 rounded border ${meta.supportingDocuments.includes(d) ? 'bg-navy text-white border-navy' : 'border-line bg-white'}`}>
                {d}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-[11px] font-semibold text-navy2 mb-2 uppercase tracking-wide">Fatal Risks</label>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
            {JSA_FATAL_RISKS.map((risk) => {
              const selected = meta.fatalRisks.includes(risk)
              return (
                <button key={risk} onClick={() => setMeta({ ...meta, fatalRisks: toggleInArray(meta.fatalRisks, risk) })}
                  className={`flex flex-col items-center gap-1.5 p-2 rounded border-2 ${selected ? 'border-gold bg-goldsoft' : 'border-line bg-[#FCFBF8]'}`}>
                  <HazardIcon templateName={risk} size={28} />
                  <span className="text-[9.5px] text-center font-medium leading-tight">{risk}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-[11px] font-semibold text-navy2 mb-2 uppercase tracking-wide">Summary of Potential Hazards</label>
          <div className="flex flex-wrap gap-2">
            {POTENTIAL_HAZARDS.map((h) => (
              <button key={h} onClick={() => setMeta({ ...meta, potentialHazards: toggleInArray(meta.potentialHazards, h) })}
                className={`text-[11px] px-2 py-1 rounded border ${meta.potentialHazards.includes(h) ? 'bg-navy text-white border-navy' : 'border-line bg-white'}`}>
                {h}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-[11px] font-semibold text-navy2 mb-1.5 uppercase tracking-wide">Can this be developed into a Safe Work Procedure?</label>
          <div className="flex gap-2">
            {['yes', 'no'].map((v) => (
              <button key={v} onClick={() => setMeta({ ...meta, canBecomeSop: v })}
                className={`text-xs px-3 py-1.5 rounded border uppercase ${meta.canBecomeSop === v ? 'bg-navy text-white border-navy' : 'border-line bg-white'}`}>
                {v}
              </button>
            ))}
        </div>
        </div>
        </div>
      </details>

      {/* Job Safety Analysis Log - the risk matrix table */}
      <details className="bg-white border border-line rounded-md border-t-4 border-t-gold mb-5">
        <summary className="cursor-pointer px-4 md:px-5 py-3 font-display text-[15px] font-semibold text-navy list-none flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-gold flex-shrink-0"></span>Job Safety Analysis Log</summary>
        <div className="px-4 md:px-5 pb-4 md:pb-5">
        <details className="mb-3 text-[11px]">
          <summary className="text-gold cursor-pointer font-medium">💡 Hazard identification reference (internal, not in report)</summary>
          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
            {HAZARD_CONTROL_REFERENCE.map((h) => (
              <div key={h.hazard} className="border border-line rounded p-2">
                <div className="font-semibold text-navy2">{h.hazard}</div>
                <div className="text-inksoft mt-1">{h.questions.join(' • ')}</div>
                <div className="text-gold mt-1">→ {h.controls.join(' • ')}</div>
              </div>
            ))}
          </div>
        </details>

        <div className="flex flex-col gap-4">
          {steps.map((step, i) => {
            const rawScore = step.likelihood && step.consequence ? step.likelihood * step.consequence : null
            const rawBand = rawScore ? riskBand(rawScore) : null
            const residualScore = step.residualLikelihood && step.residualConsequence ? step.residualLikelihood * step.residualConsequence : null
            const residualBand = residualScore ? riskBand(residualScore) : null
            return (
              <div key={i} className="border border-line rounded-md p-3">
                <div className="font-mono text-xs text-inksoft mb-2">Step {i + 1}</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 mb-2.5">
                  <div>
                    <label className="block text-[10px] font-semibold text-navy2 uppercase mb-1">Job Step</label>
                    <textarea className={inputCls} rows={2} value={step.jobStep} onChange={(e) => updateStep(i, { jobStep: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-navy2 uppercase mb-1">Job Step Hazard</label>
                    <textarea className={inputCls} rows={2} value={step.jobStepHazard} onChange={(e) => updateStep(i, { jobStepHazard: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-navy2 uppercase mb-1">Current Controls</label>
                    <textarea className={inputCls} rows={2} value={step.currentControls} onChange={(e) => updateStep(i, { currentControls: e.target.value })} />
                  </div>
                </div>

                <div className="mb-2.5">
                  <label className="block text-[10px] font-semibold text-navy2 uppercase mb-1">Evaluation of Controls (Hierarchy)</label>
                  <div className="flex flex-wrap gap-1.5">
                    {CONTROL_HIERARCHY.map((h) => (
                      <button key={h.key} onClick={() => updateStep(i, { controlHierarchy: h.key })}
                        className={`text-[11px] px-2.5 py-1 rounded border ${step.controlHierarchy === h.key ? 'bg-navy text-white border-navy' : 'border-line bg-white'}`}>
                        {h.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 mb-2.5 items-end">
                  <div>
                    <label className="block text-[10px] font-semibold text-navy2 uppercase mb-1">Likelihood</label>
                    <select className={inputCls} value={step.likelihood || ''} onChange={(e) => updateStep(i, { likelihood: Number(e.target.value) || null })}>
                      <option value="">—</option>
                      {LIKELIHOOD_LEVELS.map((l) => <option key={l.value} value={l.value}>{l.value} - {l.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-navy2 uppercase mb-1">Consequence</label>
                    <select className={inputCls} value={step.consequence || ''} onChange={(e) => updateStep(i, { consequence: Number(e.target.value) || null })}>
                      <option value="">—</option>
                      {CONSEQUENCE_LEVELS.map((c) => <option key={c.value} value={c.value}>{c.value} - {c.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-navy2 uppercase mb-1">Raw Risk</label>
                    {rawScore ? (
                      <div className={`text-xs font-bold px-2.5 py-2 rounded border ${rawBand.color === 'major' ? 'bg-majorbg border-major text-major' : rawBand.color === 'minor' ? 'bg-minorbg border-minor text-minor' : 'bg-conformbg border-conform text-conform'}`}>
                        {rawScore} — {rawBand.label}
                      </div>
                    ) : <div className="text-xs text-inksoft px-2.5 py-2">—</div>}
                  </div>
                </div>

                <div className="mb-2.5">
                  <label className="block text-[10px] font-semibold text-navy2 uppercase mb-1">Required Additional Actions</label>
                  <textarea className={inputCls} rows={2} value={step.requiredAdditionalActions} onChange={(e) => updateStep(i, { requiredAdditionalActions: e.target.value })} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 items-end">
                  <div>
                    <label className="block text-[10px] font-semibold text-navy2 uppercase mb-1">Residual Likelihood</label>
                    <select className={inputCls} value={step.residualLikelihood || ''} onChange={(e) => updateStep(i, { residualLikelihood: Number(e.target.value) || null })}>
                      <option value="">—</option>
                      {LIKELIHOOD_LEVELS.map((l) => <option key={l.value} value={l.value}>{l.value} - {l.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-navy2 uppercase mb-1">Residual Consequence</label>
                    <select className={inputCls} value={step.residualConsequence || ''} onChange={(e) => updateStep(i, { residualConsequence: Number(e.target.value) || null })}>
                      <option value="">—</option>
                      {CONSEQUENCE_LEVELS.map((c) => <option key={c.value} value={c.value}>{c.value} - {c.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-navy2 uppercase mb-1">Residual Risk</label>
                    {residualScore ? (
                      <div className={`text-xs font-bold px-2.5 py-2 rounded border ${residualBand.color === 'major' ? 'bg-majorbg border-major text-major' : residualBand.color === 'minor' ? 'bg-minorbg border-minor text-minor' : 'bg-conformbg border-conform text-conform'}`}>
                        {residualScore} — {residualBand.label}
                      </div>
                    ) : <div className="text-xs text-inksoft px-2.5 py-2">—</div>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        <button onClick={addStep} className="text-xs text-navy2 mt-3 underline">+ Add another step</button>
        </div>
      </details>

      {/* Team Member Acknowledgement - open-ended signatures */}
      <details className="bg-white border border-line rounded-md border-t-4 border-t-conform mb-5">
        <summary className="cursor-pointer px-4 md:px-5 py-3 font-display text-[15px] font-semibold text-navy list-none flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-conform flex-shrink-0"></span>Team Member Acknowledgement</summary>
        <div className="px-4 md:px-5 pb-4 md:pb-5">
        <div className="text-[11px] text-inksoft mb-4">
          Each team member confirms they have understood this Job Safety Analysis.
        </div>
        {signError && <div className="text-xs text-major bg-majorbg border border-major rounded p-2 mb-3">{signError}</div>}
        {!id && <div className="text-xs text-minor bg-minorbg border border-minor rounded p-2 mb-3">Save the JSA at least once before signing.</div>}

        <div className="flex flex-col gap-2 mb-3">
          {teamSignoffs.map((s) => (
            <div key={s.id} className="border border-line rounded p-2.5 flex items-center gap-3">
              {s.signature_image && <img src={s.signature_image} alt="" className="h-10 object-contain" />}
              <div className="text-xs">
                <div className="font-medium text-navy">{s.signatory_name} {s.employee_id_no && `(${s.employee_id_no})`}</div>
                <div className="text-inksoft">{new Date(s.signed_at).toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>

        {signing?.kind === 'team' ? (
          <div className="max-w-sm">
            <SignaturePad
              savedSignature={savedSignature}
              onSaveForReuse={(img, name) => { saveSignatureForReuse(img, name); setSavedSignature({ signature_image: img, full_name: name }) }}
              showEmployeeId
              showNameField
              onSign={handleSignTeamMember}
            />
          </div>
        ) : (
          <button onClick={() => setSigning({ kind: 'team' })} className="text-xs text-navy border border-navy/40 px-3 py-1.5 rounded">
            + Add team member signature
          </button>
        )}
        </div>
      </details>

      {/* Supervisor Acknowledgements */}
      <details className="bg-white border border-line rounded-md border-t-4 border-t-navy2 mb-5">
        <summary className="cursor-pointer px-4 md:px-5 py-3 font-display text-[15px] font-semibold text-navy list-none flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-navy2 flex-shrink-0"></span>Supervisor Acknowledgement</summary>
        <div className="px-4 md:px-5 pb-4 md:pb-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { key: 'senior', role: 'senior_supervisor', label: `Senior Supervisor — ${meta.seniorSupervisorName || '(not set)'}`, existing: seniorSupervisorSignoff },
            { key: 'workgroup', role: 'work_group_supervisor', label: `Work Group Supervisor — ${meta.workGroupSupervisorName || '(not set)'}`, existing: workGroupSupervisorSignoff },
          ].map((slot) => (
            <div key={slot.key}>
              <label className="block text-[11.5px] font-semibold text-navy2 mb-1.5 uppercase tracking-wide">{slot.label}</label>
              {slot.existing ? (
                <div className="border-[1.5px] border-solid border-conform bg-white rounded-md p-3">
                  {slot.existing.signature_image && <img src={slot.existing.signature_image} alt="Signature" className="h-14 object-contain mb-1" />}
                  <div className="text-xs text-navy font-medium">{slot.existing.signatory_name}</div>
                  <div className="text-[10.5px] text-inksoft">Signed {new Date(slot.existing.signed_at).toLocaleString()} • Consent recorded</div>
                </div>
              ) : signing?.kind === slot.key ? (
                <SignaturePad
                  signatoryName={slot.key === 'senior' ? meta.seniorSupervisorName : meta.workGroupSupervisorName}
                  savedSignature={savedSignature}
                  onSaveForReuse={(img, name) => { saveSignatureForReuse(img, name); setSavedSignature({ signature_image: img, full_name: name }) }}
                  showEmployeeId
                  onSign={(sigData) => handleSignSupervisor(slot.role, sigData)}
                />
              ) : (
                <div onClick={() => setSigning({ kind: slot.key })} className="border-[1.5px] border-dashed border-line rounded-md h-[90px] flex items-center justify-center cursor-pointer bg-[#FCFBF8] text-inksoft text-xs italic font-display">
                  Click to sign
                </div>
              )}
            </div>
          ))}
        </div>
        </div>
      </details>

      {/* Daily Review, for multi-shift JSAs */}
      {isMultiDay && (
        <details className="bg-white border border-line rounded-md border-t-4 border-t-minor">
        <summary className="cursor-pointer px-4 md:px-5 py-3 font-display text-[15px] font-semibold text-navy list-none flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-minor flex-shrink-0"></span>Daily Review (multi-shift use, {validityDays} days)</summary>
          <div className="px-4 md:px-5 pb-4 md:pb-5">
          <div className="text-[11px] text-inksoft mb-4">
            This JSA is valid for more than one shift. Worksheet must be reviewed daily by all members of the work group, confirming their understanding by signing.
          </div>

          {Array.from({ length: validityDays + 1 }, (_, i) => {
            const d = new Date(meta.validFrom)
            d.setDate(d.getDate() + i)
            const dateStr = d.toISOString().slice(0, 10)
            const dayReviews = dailyReviews.filter((r) => r.review_date === dateStr)
            return (
              <div key={dateStr} className="border border-line rounded p-3 mb-2.5">
                <div className="font-mono text-xs text-navy2 font-semibold mb-2">{dateStr}</div>
                <div className="flex flex-col gap-1.5 mb-2">
                  {dayReviews.map((r) => (
                    <div key={r.id} className="flex items-center gap-2 text-xs">
                      {r.signature_image && <img src={r.signature_image} alt="" className="h-7 object-contain" />}
                      <span>{r.signatory_name} {r.employee_id_no && `(${r.employee_id_no})`} — {new Date(r.signed_at).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
                {signing?.kind === 'daily' && signing.date === dateStr ? (
                  <div className="max-w-sm">
                    <SignaturePad
                      savedSignature={savedSignature}
                      onSaveForReuse={(img, name) => { saveSignatureForReuse(img, name); setSavedSignature({ signature_image: img, full_name: name }) }}
                      showEmployeeId
                      showNameField
                      onSign={(sigData) => handleSignDailyReview(dateStr, sigData)}
                    />
                  </div>
                ) : (
                  <button onClick={() => setSigning({ kind: 'daily', date: dateStr })} className="text-[11px] text-navy border border-navy/40 px-2.5 py-1 rounded">
                    + Add review signature for this day
                  </button>
                )}
              </div>
            )
          })}
          </div>
        </details>
      )}
    </div>
  )
}
