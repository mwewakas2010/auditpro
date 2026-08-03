import { useEffect, useRef, useState } from 'react'
import { loadTemplateStructure, loadCCV, saveCCV } from '../lib/ccvRepo'
import { generateCCVPdf } from '../utils/ccvPdfExport'
import CameraCapture from './CameraCapture.jsx'

function emptyMeta() {
  return { assessors: '', dateTime: '', location: '', department: '', section: '', status: 'in_progress' }
}

export default function CCVEditor({ ccvId, templateId, onExit }) {
  const [id, setId] = useState(ccvId)
  const [template, setTemplate] = useState(null)
  const [categories, setCategories] = useState([])
  const [meta, setMeta] = useState(emptyMeta)
  const [responses, setResponses] = useState({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [cameraOpenFor, setCameraOpenFor] = useState(null)
  const fileInputs = useRef({})

  useEffect(() => {
    ;(async () => {
      try {
        if (ccvId) {
          const result = await loadCCV(ccvId)
          setTemplate(result.template)
          setCategories(result.categories)
          setMeta({
            assessors: result.instance.assessors || '',
            dateTime: result.instance.date_time ? result.instance.date_time.slice(0, 16) : '',
            location: result.instance.location || '',
            department: result.instance.department || '',
            section: result.instance.section || '',
            status: result.instance.status || 'in_progress',
          })
          setResponses(result.responses)
        } else {
          const { template: t, categories: cats } = await loadTemplateStructure(templateId)
          setTemplate(t)
          setCategories(cats)
        }
      } catch (err) {
        setLoadError(err.message)
      }
      setLoading(false)
    })()
  }, [ccvId, templateId])

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
    try {
      const newMeta = markFinal ? { ...meta, status: 'final' } : meta
      const savedId = await saveCCV({ ccvId: id, templateId: template.id, meta: newMeta, responses })
      setId(savedId)
      setMeta(newMeta)
      const result = await loadCCV(savedId)
      setResponses(result.responses)
      setSaveMsg('Saved ' + new Date().toLocaleTimeString())
    } catch (err) {
      setSaveMsg('Error: ' + err.message)
    }
    setSaving(false)
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
          <h1 className="font-display text-xl font-semibold text-navy">{template.name}</h1>
          <div className="font-mono text-[11px] text-inksoft mt-0.5">
            {template.document_reference} • Rev {template.revision_number} • {template.total_pages} pages • Issued{' '}
            {template.date_of_issue} • Next review {template.date_of_next_review}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => handleSave(false)} disabled={saving} className="bg-navy text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50">
            {saving ? 'Saving…' : 'Save CCV'}
          </button>
          <button onClick={() => handleSave(true)} disabled={saving} className="bg-white text-navy border-[1.5px] border-navy px-4 py-2 rounded text-sm font-medium">
            Mark as Final
          </button>
          {id && (
            <button
              onClick={() => generateCCVPdf({ template, categories, meta, responses })}
              className="bg-white text-navy border-[1.5px] border-navy px-4 py-2 rounded text-sm font-medium"
            >
              Export PDF
            </button>
          )}
        </div>
      </div>

      {saveMsg && (
        <div className={`text-xs mb-4 px-3 py-1.5 rounded ${saveMsg.startsWith('Error') ? 'bg-majorbg text-major' : 'bg-conformbg text-conform'}`}>
          {saveMsg}
        </div>
      )}

      <div className="bg-white border border-line rounded-md p-4 md:p-5 mb-5 grid grid-cols-1 md:grid-cols-3 gap-4">
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
      </div>

      {categories.map((cat) => {
        const score = categoryScore(cat)
        return (
          <div key={cat.id} className="bg-white border border-line rounded-md mb-4 overflow-hidden">
            <div className="bg-navy text-white px-4 py-2.5 flex justify-between items-center">
              <div className="font-display font-semibold text-sm">{cat.category_number} {cat.name}</div>
              <div className="font-mono text-xs text-gold">{score.yes} / {score.total}</div>
            </div>
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
          </div>
        )
      })}

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
