import { useEffect, useRef, useState } from 'react'
import { loadTemplateStructure, loadCCV, saveCCV, syncPendingCCVs } from '../lib/ccvRepo'
import { listCompanies } from '../lib/companyRepo'
import { saveLocalCCV, getLocalCCV, deleteLocalCCV } from '../lib/offlineStore'
import { useOnlineStatus } from '../lib/useOnlineStatus'
import { signCCV, loadCCVSignoffs, getSavedSignature, saveSignatureForReuse } from '../lib/signatureRepo'
import { generateCCVPdf } from '../utils/ccvPdfExport'
import CameraCapture from './CameraCapture.jsx'
import SignaturePad from './SignaturePad.jsx'
import HazardIcon from './HazardIcon.jsx'

function emptyMeta() {
  return { assessors: '', dateTime: '', location: '', department: '', section: '', task: '', site: '', isUnplanned: false, status: 'in_progress' }
}

export default function CCVEditor({ ccvId, templateId, onExit }) {
  const [id, setId] = useState(ccvId)
  const [localId, setLocalId] = useState(() => ccvId || `local-${crypto.randomUUID()}`)
  const [template, setTemplate] = useState(null)
  const [categories, setCategories] = useState([])
  const [meta, setMeta] = useState(emptyMeta)
  const [responses, setResponses] = useState({})
  const [companies, setCompanies] = useState([])
  const [companyId, setCompanyId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [companiesError, setCompaniesError] = useState('')
  const [cameraOpenFor, setCameraOpenFor] = useState(null)
  const [offlineLoaded, setOfflineLoaded] = useState(false)
  const [signoffs, setSignoffs] = useState({ assessor: null })
  const [savedSignature, setSavedSignature] = useState(null)
  const [signing, setSigning] = useState(false)
  const [signError, setSignError] = useState('')
  const fileInputs = useRef({})

  const online = useOnlineStatus()
  const hasInitiallyLoaded = useRef(false)
  const wasOffline = useRef(!online)

  useEffect(() => {
    listCompanies().then(setCompanies).catch((err) => setCompaniesError(err.message))
    getSavedSignature().then(setSavedSignature).catch(() => {})
  }, [])

  useEffect(() => {
    if (id) loadCCVSignoffs(id).then(setSignoffs).catch(() => {})
  }, [id])

  useEffect(() => {
    ;(async () => {
      try {
        if (ccvId) {
          const local = await getLocalCCV(ccvId)
          if (local && local.pendingSync) {
            const { template: t, categories: cats } = await loadTemplateStructure(local.templateId)
            setTemplate(t)
            setCategories(cats)
            setMeta(local.meta)
            setResponses(local.responses)
            setCompanyId(local.companyId || null)
            setOfflineLoaded(true)
            setLoading(false)
            hasInitiallyLoaded.current = true
            return
          }

          const result = await loadCCV(ccvId)
          setTemplate(result.template)
          setCategories(result.categories)
          const loadedMeta = {
            assessors: result.instance.assessors || '',
            dateTime: result.instance.date_time ? result.instance.date_time.slice(0, 16) : '',
            location: result.instance.location || '',
            department: result.instance.department || '',
            section: result.instance.section || '',
            task: result.instance.task || '',
            site: result.instance.site || '',
            isUnplanned: !!result.instance.is_unplanned,
            status: result.instance.status || 'in_progress',
          }
          setMeta(loadedMeta)
          setResponses(result.responses)
          setCompanyId(result.instance.company_id || null)
          await saveLocalCCV(ccvId, {
            templateId: result.template.id,
            companyId: result.instance.company_id || null,
            meta: loadedMeta,
            responses: result.responses,
            pendingSync: false,
          })
        } else {
          const { template: t, categories: cats } = await loadTemplateStructure(templateId)
          setTemplate(t)
          setCategories(cats)
        }
      } catch (err) {
        if (ccvId) {
          const local = await getLocalCCV(ccvId)
          if (local) {
            const { template: t, categories: cats } = await loadTemplateStructure(local.templateId)
            setTemplate(t)
            setCategories(cats)
            setMeta(local.meta)
            setResponses(local.responses)
            setCompanyId(local.companyId || null)
            setOfflineLoaded(true)
          } else {
            setLoadError(err.message)
          }
        } else {
          setLoadError(err.message)
        }
      }
      setLoading(false)
      hasInitiallyLoaded.current = true
    })()
  }, [ccvId, templateId])

  useEffect(() => {
    if (!hasInitiallyLoaded.current || !template) return
    const t = setTimeout(() => {
      saveLocalCCV(localId, { templateId: template.id, companyId, meta, responses, pendingSync: true })
    }, 600)
    return () => clearTimeout(t)
  }, [meta, responses, companyId, localId, template])

  useEffect(() => {
    if (online && wasOffline.current) {
      syncPendingCCVs().then(({ succeeded, failed, total, synced }) => {
        if (total > 0) {
          setSaveMsg(
            failed > 0
              ? `Back online — synced ${succeeded} of ${total} pending CCV(s), ${failed} failed.`
              : `Back online — synced ${succeeded} pending CCV(s).`
          )
        }
        const match = synced?.find((s) => s.localId === localId)
        if (match) {
          setId(match.realId)
          setLocalId(match.realId)
        }
      })
    }
    wasOffline.current = !online
  }, [online])

  const updateResponse = (itemId, patch) => {
    setResponses((prev) => ({
      ...prev,
      [itemId]: { compliance: null, actionText: '', responsiblePerson: '', dueDate: '', thumbs: [], ...prev[itemId], ...patch },
    }))
  }

  const addThumb = (itemId, thumb) => {
    const current = responses[itemId]?.thumbs || []
    updateResponse(itemId, { thumbs: [...current, thumb] })
  }

  const removeThumb = (itemId, index) => {
    const current = responses[itemId]?.thumbs || []
    updateResponse(itemId, { thumbs: current.filter((_, i) => i !== index) })
  }

  const handleFileChange = (itemId, e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const isImage = file.type.startsWith('image/')
    const capturedAt = new Date().toISOString()
    if (isImage) {
      const reader = new FileReader()
      reader.onload = () => addThumb(itemId, { kind: 'file', label: file.name, dataUrl: reader.result, capturedAt })
      reader.readAsDataURL(file)
    } else {
      addThumb(itemId, { kind: 'file', label: file.name, dataUrl: null, capturedAt })
    }
    e.target.value = ''
  }

  const categoryScore = (category) => {
    const items = category.checklist_template_items
    const yesCount = items.filter((it) => responses[it.id]?.compliance === 'yes').length
    return { yes: yesCount, total: items.length }
  }

  const handleSave = async (markFinal) => {
    setSaving(true)
    setSaveMsg('')
    const newMeta = markFinal ? { ...meta, status: 'final' } : meta

    if (!online) {
      await saveLocalCCV(localId, { templateId: template.id, companyId, meta: newMeta, responses, pendingSync: true })
      setMeta(newMeta)
      setSaveMsg("📴 Offline — saved on this device. Will sync automatically once you're back online.")
      setSaving(false)
      return
    }

    try {
      const savedId = await saveCCV({ ccvId: id, templateId: template.id, companyId, meta: newMeta, responses })
      if (localId !== savedId) {
        await deleteLocalCCV(localId)
        setLocalId(savedId)
      }
      setId(savedId)
      setMeta(newMeta)
      const result = await loadCCV(savedId)
      setResponses(result.responses)
      await saveLocalCCV(savedId, { templateId: template.id, companyId, meta: newMeta, responses: result.responses, pendingSync: false })
      setSaveMsg('Saved ' + new Date().toLocaleTimeString())
      setOfflineLoaded(false)
    } catch (err) {
      await saveLocalCCV(localId, { templateId: template.id, companyId, meta: newMeta, responses, pendingSync: true })
      const looksLikeNetworkFailure = !online || err.name === 'TypeError' || /fetch|network/i.test(err.message || '')
      if (looksLikeNetworkFailure) {
        setSaveMsg("Could not reach the server — saved on this device instead. Will retry automatically once back online.")
      } else {
        setSaveMsg(`Error: ${err.message || 'Save was rejected by the server.'} (Your work is still saved on this device.)`)
      }
    }
    setSaving(false)
  }

  const handleSign = async (sigData) => {
    setSignError('')
    if (!id) {
      setSignError('Save the CCV at least once before signing.')
      return
    }
    try {
      const contentSnapshot = {
        meta,
        responses: Object.fromEntries(Object.entries(responses).map(([k, r]) => [k, { compliance: r.compliance, actionText: r.actionText }])),
      }
      await signCCV(id, 'assessor', {
        signatureImage: sigData.signatureImage,
        signatoryName: sigData.signatoryName || meta.assessors,
        consentAccepted: sigData.consentAccepted,
        userAgent: sigData.userAgent,
        contentSnapshot,
      })
      const fresh = await loadCCVSignoffs(id)
      setSignoffs(fresh)
      setSigning(false)
    } catch (err) {
      setSignError(err.message)
    }
  }

  if (loading) return <div className="p-9 text-inksoft text-sm">Loading…</div>
  if (loadError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6">
        <div className="text-sm text-major bg-majorbg border border-major rounded p-4 max-w-md text-center">
          Could not load: {loadError}
        </div>
        <button onClick={onExit} className="bg-navy text-white px-4 py-2 rounded text-sm font-medium">
          ← Back to CCVs
        </button>
      </div>
    )
  }

  const inputCls = 'w-full px-2.5 py-2 border border-line rounded text-sm bg-[#FCFBF8]'

  return (
    <div className="p-4 md:p-9">
      <div className="flex flex-col md:flex-row justify-between md:items-start gap-3 mb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-14 h-14 rounded bg-navy/5 border border-line flex items-center justify-center flex-shrink-0">
              <HazardIcon templateName={template.name} size={44} className="text-navy" />
            </div>
            <h1 className="font-display text-xl font-semibold text-navy">{template.name}</h1>
          </div>
          <div className="font-mono text-[11px] text-inksoft mt-0.5">
            {template.document_reference} • Rev {template.revision_number} • {template.total_pages} pages • Issued{' '}
            {template.date_of_issue} • Next review {template.date_of_next_review}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <button onClick={() => handleSave(false)} disabled={saving} className="bg-navy text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50">
            {saving ? 'Saving…' : 'Save CCV'}
          </button>
          <button onClick={() => handleSave(true)} disabled={saving} className="bg-white text-navy border-[1.5px] border-navy px-4 py-2 rounded text-sm font-medium">
            Mark as Final
          </button>
          {id && (
            <button
              onClick={async () => await generateCCVPdf({ template, categories, meta, responses, company: companies.find((c) => c.id === companyId), signoff: signoffs.assessor })}
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
        <div
          className={`text-xs mb-4 px-3 py-1.5 rounded ${
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

      <div className="bg-white border border-line rounded-md p-4 md:p-5 mb-5 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-[11px] font-semibold text-navy2 mb-1.5 uppercase tracking-wide">Company</label>
          <select className={inputCls} value={companyId || ''} onChange={(e) => setCompanyId(e.target.value || null)}>
            <option value="">No company selected</option>
            {companies.map((co) => (
              <option key={co.id} value={co.id}>{co.name}</option>
            ))}
          </select>
          {companiesError && (
            <div className="text-[10.5px] text-major mt-1">Could not load companies: {companiesError}</div>
          )}
          {!companiesError && companies.length === 0 && (
            <div className="text-[10.5px] text-inksoft mt-1">
              No companies yet — add one in "Manage Companies" first.
            </div>
          )}
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-navy2 mb-1.5 uppercase tracking-wide">Assessors</label>
          <input className={inputCls} value={meta.assessors} onChange={(e) => setMeta({ ...meta, assessors: e.target.value })} />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-navy2 mb-1.5 uppercase tracking-wide">Date, Time</label>
          <input type="datetime-local" className={inputCls} value={meta.dateTime} onChange={(e) => setMeta({ ...meta, dateTime: e.target.value })} />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-navy2 mb-1.5 uppercase tracking-wide">Location</label>
          <input className={inputCls} value={meta.location} onChange={(e) => setMeta({ ...meta, location: e.target.value })} />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-navy2 mb-1.5 uppercase tracking-wide">Department</label>
          <input className={inputCls} value={meta.department} onChange={(e) => setMeta({ ...meta, department: e.target.value })} />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-navy2 mb-1.5 uppercase tracking-wide">Section</label>
          <input className={inputCls} value={meta.section} onChange={(e) => setMeta({ ...meta, section: e.target.value })} />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-navy2 mb-1.5 uppercase tracking-wide">Task</label>
          <input className={inputCls} value={meta.task} onChange={(e) => setMeta({ ...meta, task: e.target.value })} />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-navy2 mb-1.5 uppercase tracking-wide">Site</label>
          <input className={inputCls} value={meta.site} onChange={(e) => setMeta({ ...meta, site: e.target.value })} />
        </div>
        <div className="flex items-end pb-1">
          <label className="flex items-center gap-2 text-xs font-medium text-navy2">
            <input
              type="checkbox"
              checked={meta.isUnplanned}
              onChange={(e) => setMeta({ ...meta, isUnplanned: e.target.checked })}
            />
            Unplanned work (e.g. breakdown/unscheduled)
          </label>
        </div>
      </div>

      {categories.map((cat) => {
        const score = categoryScore(cat)
        return (
          <details key={cat.id} className="bg-white border border-line rounded-md mb-4 overflow-hidden">
            <summary className="bg-navy text-white px-4 py-2.5 flex justify-between items-center cursor-pointer list-none">
              <div className="font-display font-semibold text-sm">{cat.category_number} {cat.name}</div>
              <div className="font-mono text-xs text-gold">{score.yes} / {score.total}</div>
            </summary>
            <div className="divide-y divide-line">
              {cat.checklist_template_items.map((item) => {
                const r = responses[item.id] || { compliance: null, thumbs: [] }
                return (
                  <div key={item.id} className="p-4">
                    <div className="flex justify-between items-start gap-3">
                      <div className="text-sm flex-1">
                        <span className="font-mono text-xs text-gold mr-1.5">{item.item_number}</span>
                        {item.requirement_text}
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => updateResponse(item.id, { compliance: 'yes' })}
                          className={`text-xs px-3 py-1.5 rounded border ${r.compliance === 'yes' ? 'bg-conformbg border-conform text-conform' : 'border-line bg-white'}`}
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => updateResponse(item.id, { compliance: 'no' })}
                          className={`text-xs px-3 py-1.5 rounded border ${r.compliance === 'no' ? 'bg-majorbg border-major text-major' : 'border-line bg-white'}`}
                        >
                          No
                        </button>
                      </div>
                    </div>

                    {r.compliance === 'no' && (
                      <div className="mt-3 bg-majorbg/40 border border-major/30 rounded p-3 grid grid-cols-1 md:grid-cols-3 gap-2.5">
                        <div className="md:col-span-1">
                          <label className="block text-[10.5px] font-semibold text-major uppercase tracking-wide mb-1">Action</label>
                          <input
                            className="w-full px-2 py-1.5 border border-line rounded text-xs"
                            value={r.actionText}
                            onChange={(e) => updateResponse(item.id, { actionText: e.target.value })}
                            placeholder="Corrective action needed"
                          />
                        </div>
                        <div>
                          <label className="block text-[10.5px] font-semibold text-major uppercase tracking-wide mb-1">Responsible Person</label>
                          <input
                            className="w-full px-2 py-1.5 border border-line rounded text-xs"
                            value={r.responsiblePerson}
                            onChange={(e) => updateResponse(item.id, { responsiblePerson: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-[10.5px] font-semibold text-major uppercase tracking-wide mb-1">Due Date</label>
                          <input
                            type="date"
                            className="w-full px-2 py-1.5 border border-line rounded text-xs"
                            value={r.dueDate}
                            onChange={(e) => updateResponse(item.id, { dueDate: e.target.value })}
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 mt-2.5 flex-wrap items-center">
                      <button onClick={() => setCameraOpenFor(item.id)} className="text-[11px] px-2.5 py-1.5 border border-line rounded bg-[#FCFBF8]">
                        📷 Take Photo
                      </button>
                      <button onClick={() => fileInputs.current[item.id]?.click()} className="text-[11px] px-2.5 py-1.5 border border-line rounded bg-[#FCFBF8]">
                        📎 Upload File
                      </button>
                      <input
                        type="file"
                        accept="image/*,.pdf,.doc,.docx"
                        ref={(el) => (fileInputs.current[item.id] = el)}
                        onChange={(e) => handleFileChange(item.id, e)}
                        className="hidden"
                      />
                      {(r.thumbs || []).map((t, i) => (
                        <div key={i} className="w-11 h-11 rounded border border-line relative overflow-hidden group">
                          {(t.dataUrl || t.remoteUrl) ? (
                            <img src={t.dataUrl || t.remoteUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-nabg flex items-center justify-center text-[9px]">📄</div>
                          )}
                          <button
                            onClick={() => removeThumb(item.id, i)}
                            className="absolute top-0 right-0 w-3.5 h-3.5 bg-major text-white rounded-full text-[9px] leading-none opacity-0 group-hover:opacity-100"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </details>
        )
      })}

      <div className="bg-white border border-line rounded-md p-4 md:p-5 mt-5">
        <h3 className="font-display text-[15px] font-semibold text-navy mb-3">Sign-off</h3>
        {signError && <div className="text-xs text-major bg-majorbg border border-major rounded p-2 mb-3">{signError}</div>}
        {!id && (
          <div className="text-xs text-minor bg-minorbg border border-minor rounded p-2 mb-3">
            Save the CCV at least once before signing.
          </div>
        )}
        {signoffs.assessor ? (
          <div className="border-[1.5px] border-solid border-conform bg-white rounded-md p-3 max-w-sm">
            {signoffs.assessor.signature_image && (
              <img src={signoffs.assessor.signature_image} alt="Signature" className="h-14 object-contain mb-1" />
            )}
            <div className="text-xs text-navy font-medium">{signoffs.assessor.signatory_name}</div>
            <div className="text-[10.5px] text-inksoft">
              Signed {new Date(signoffs.assessor.signed_at).toLocaleString()} • Consent recorded • Hash: {signoffs.assessor.content_hash?.slice(0, 12)}…
            </div>
          </div>
        ) : signing ? (
          <div className="max-w-sm">
            <SignaturePad
              signatoryName={meta.assessors}
              savedSignature={savedSignature}
              onSaveForReuse={(img, name) => { saveSignatureForReuse(img, name); setSavedSignature({ signature_image: img, full_name: name }) }}
              onSign={handleSign}
            />
          </div>
        ) : (
          <div
            onClick={() => setSigning(true)}
            className="border-[1.5px] border-dashed border-line rounded-md h-[90px] max-w-sm flex items-center justify-center cursor-pointer bg-[#FCFBF8] text-inksoft text-xs italic font-display"
          >
            Click to sign
          </div>
        )}
      </div>

      {cameraOpenFor && (
        <CameraCapture
          onCapture={({ dataUrl, fileName, capturedAt }) => {
            addThumb(cameraOpenFor, { kind: 'photo', label: fileName, dataUrl, capturedAt })
            setCameraOpenFor(null)
          }}
          onClose={() => setCameraOpenFor(null)}
        />
      )}
    </div>
  )
}
