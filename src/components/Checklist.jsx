import { useRef, useState } from 'react'
import { schemes } from '../data/schemes'
import CameraCapture from './CameraCapture.jsx'

const schemeNotes = {
  simple: 'Internal / Second-party audit — classification: Conforming, Nonconforming, OFI, N/A',
  full: 'Stage 1 (Recommendation) / Stage 2 (Certification) audit — classification: Conforming, Minor NC, Major NC, OFI, N/A',
}

const statusBtnActive = {
  conform: 'bg-conformbg border-conform text-conform',
  minor: 'bg-minorbg border-minor text-minor',
  major: 'bg-majorbg border-major text-major',
  nc: 'bg-majorbg border-major text-major',
  ofi: 'bg-ofibg border-ofi text-ofi',
  na: 'bg-nabg border-na text-na',
}

export default function Checklist({ scheme, checklist, setChecklist, clauses, standardLabel }) {
  const statuses = schemes[scheme]
  const [cameraOpenFor, setCameraOpenFor] = useState(null)
  const fileInputs = useRef({})
  const [aiState, setAiState] = useState({})

  const updateEntry = (code, patch) => {
    setChecklist({ ...checklist, [code]: { ...checklist[code], ...patch } })
  }

  const requestImprovement = async (clause) => {
    const code = clause.clause_code
    const entry = checklist[code]
    setAiState((prev) => ({ ...prev, [code]: { loading: true, suggestion: null, error: null } }))
    try {
      const res = await fetch('/api/ai-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clauseCode: clause.clause_code,
          clauseTitle: clause.title,
          requirementText: clause.requirement_text,
          status: entry.status,
          draftText: entry.evidenceText,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Request failed')
      setAiState((prev) => ({ ...prev, [code]: { loading: false, suggestion: data.text, error: null } }))
    } catch (err) {
      setAiState((prev) => ({ ...prev, [code]: { loading: false, suggestion: null, error: err.message } }))
    }
  }

  const acceptSuggestion = (code) => {
    updateEntry(code, { evidenceText: aiState[code].suggestion })
    setAiState((prev) => ({ ...prev, [code]: { loading: false, suggestion: null, error: null } }))
  }

  const discardSuggestion = (code) => {
    setAiState((prev) => ({ ...prev, [code]: { loading: false, suggestion: null, error: null } }))
  }

  const addThumb = (code, thumb) => {
    const entry = checklist[code]
    updateEntry(code, { thumbs: [...entry.thumbs, thumb] })
  }

  const removeThumb = (code, index) => {
    const entry = checklist[code]
    updateEntry(code, { thumbs: entry.thumbs.filter((_, i) => i !== index) })
  }

  const handleFileChange = (code, e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const isImage = file.type.startsWith('image/')
    const capturedAt = new Date().toISOString()
    if (isImage) {
      const reader = new FileReader()
      reader.onload = () => {
        addThumb(code, { kind: 'file', label: file.name, dataUrl: reader.result, capturedAt })
      }
      reader.readAsDataURL(file)
    } else {
      addThumb(code, { kind: 'file', label: file.name, dataUrl: null, capturedAt })
    }
    e.target.value = ''
  }

  return (
    <div>
      <h2 className="font-display text-[17px] font-semibold text-navy mb-1">
        Checklist — {standardLabel}
      </h2>
      <div className="text-[12.5px] text-inksoft mb-1">
        Mark each requirement, attach evidence, capture photos in the field.
      </div>
      <div className="text-[11.5px] text-inksoft italic mb-5">{schemeNotes[scheme]}</div>

      {clauses.map((c) => {
        const entry = checklist[c.clause_code]
        return (
          <div
            key={c.clause_code}
            className={`bg-white border rounded-md mb-4 overflow-hidden ${
              entry.status === 'conform' ? 'border-conform' : 'border-line'
            }`}
          >
            <div className="px-5 py-3.5 border-b border-line relative">
              <div className="font-mono text-xs text-gold font-semibold tracking-wide">{c.clause_code}</div>
              <div className="font-display text-[15.5px] font-semibold mt-0.5">{c.title}</div>
              <div className="text-[12.5px] text-inksoft mt-1.5 leading-relaxed">{c.requirement_text}</div>
              {entry.status === 'conform' && (
                <div className="absolute top-2.5 right-4 w-[52px] h-[52px] rounded-full border-2 border-conform text-conform flex items-center justify-center font-mono text-[8.5px] font-semibold text-center -rotate-6">
                  CONFORMS<br />✓
                </div>
              )}
            </div>

            <div className="px-5 py-4">
              <div className="flex gap-2 mb-3.5 flex-wrap">
                {statuses.map((st) => (
                  <button
                    key={st.key}
                    onClick={() => updateEntry(c.clause_code, { status: st.key })}
                    className={`px-3.5 py-1.5 rounded border-[1.5px] text-xs font-medium ${
                      entry.status === st.key ? statusBtnActive[st.key] : 'border-line bg-white'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-[1fr_220px] gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[11.5px] font-semibold text-navy2 uppercase tracking-wide">
                      Evidence / Observation
                    </label>
                    <button
                      onClick={() => requestImprovement(c)}
                      disabled={!entry.evidenceText?.trim() || aiState[c.clause_code]?.loading}
                      className="text-[11px] px-2 py-1 border border-gold text-gold rounded hover:bg-goldsoft disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      {aiState[c.clause_code]?.loading ? '✨ Thinking…' : '✨ Improve Wording'}
                    </button>
                  </div>
                  <textarea
                    className="w-full px-2.5 py-2 border border-line rounded text-[13.5px] bg-[#FCFBF8] min-h-[56px]"
                    placeholder="Describe what was observed, documents sighted, interviews conducted..."
                    value={entry.evidenceText}
                    onChange={(e) => updateEntry(c.clause_code, { evidenceText: e.target.value })}
                  />
                  {aiState[c.clause_code]?.error && (
                    <div className="text-[11.5px] text-major bg-majorbg border border-major rounded p-2 mt-2">
                      {aiState[c.clause_code].error}
                    </div>
                  )}
                  {aiState[c.clause_code]?.suggestion && (
                    <div className="border border-gold bg-goldsoft/40 rounded p-2.5 mt-2">
                      <div className="text-[10.5px] font-semibold text-navy2 uppercase tracking-wide mb-1">
                        Suggested rewrite
                      </div>
                      <div className="text-[13px] text-ink mb-2">{aiState[c.clause_code].suggestion}</div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => acceptSuggestion(c.clause_code)}
                          className="text-[11px] px-2.5 py-1 bg-navy text-white rounded"
                        >
                          Use this
                        </button>
                        <button
                          onClick={() => discardSuggestion(c.clause_code)}
                          className="text-[11px] px-2.5 py-1 border border-line rounded"
                        >
                          Discard
                        </button>
                      </div>
                    </div>
                  )}
                  <label className="flex items-center gap-1.5 text-xs text-inksoft mt-2.5">
                    <input
                      type="checkbox"
                      checked={!!entry.evidenceAvailable}
                      onChange={(e) => updateEntry(c.clause_code, { evidenceAvailable: e.target.checked })}
                    />
                    Evidence available
                  </label>
                  <label className="flex items-center gap-1.5 text-xs mt-3">
                    <input
                      type="checkbox"
                      checked={entry.followUp}
                      onChange={(e) => updateEntry(c.clause_code, { followUp: e.target.checked })}
                    />
                    🚩 Mark for follow-up in field
                  </label>
                </div>
                <div>
                  <label className="block text-[11.5px] font-semibold text-navy2 mb-1.5 uppercase tracking-wide">
                    Attach Evidence
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => setCameraOpenFor(c.clause_code)}
                      className="text-[11.5px] px-2.5 py-1.5 border border-line rounded bg-[#FCFBF8] flex items-center gap-1"
                    >
                      📷 Take Photo
                    </button>
                    <button
                      onClick={() => fileInputs.current[c.clause_code]?.click()}
                      className="text-[11.5px] px-2.5 py-1.5 border border-line rounded bg-[#FCFBF8] flex items-center gap-1"
                    >
                      📎 Upload File
                    </button>
                    <input
                      type="file"
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                      ref={(el) => (fileInputs.current[c.clause_code] = el)}
                      onChange={(e) => handleFileChange(c.clause_code, e)}
                      className="hidden"
                    />
                  </div>
                  <div className="flex gap-2 flex-wrap mt-2.5">
                    {entry.thumbs.map((t, i) => (
                      <div
                        key={i}
                        className="w-14 h-14 rounded border border-line relative overflow-hidden group"
                        title={t.label}
                      >
                        {(t.dataUrl || t.remoteUrl) ? (
                          <img src={t.dataUrl || t.remoteUrl} alt={t.label} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-[#DDE3EA] to-[#C7CEDA] flex flex-col items-center justify-center text-[9px] text-inksoft text-center px-0.5">
                            📄
                            <span className="truncate w-full leading-tight">{t.label}</span>
                          </div>
                        )}
                        <button
                          onClick={() => removeThumb(c.clause_code, i)}
                          className="absolute top-0.5 right-0.5 w-4 h-4 bg-major text-white rounded-full text-[10px] leading-none opacity-0 group-hover:opacity-100 flex items-center justify-center"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
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
