import { useEffect, useRef, useState } from 'react'

const CONSENT_TEXT =
  'By signing below, I confirm that this electronic signature is intended by me to serve as my legal signature on this document, that I approve its contents as they stand at this moment, and that I understand this signature is recorded together with my identity, the date and time, and this device, in accordance with the Electronic Communications and Transactions Act, 2021.'

// Renders typed text onto a canvas in a signature-like font, so both draw
// and type modes end up producing the same kind of artifact: an image.
function renderTypedSignature(canvas, text) {
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#16253D'
  ctx.font = `italic 40px "Fraunces", "Segoe Script", cursive`
  ctx.textBaseline = 'middle'
  ctx.fillText(text || '', 16, canvas.height / 2)
}

export default function SignaturePad({ signatoryName, onSign, savedSignature, onSaveForReuse }) {
  const canvasRef = useRef(null)
  const [mode, setMode] = useState('draw') // 'draw' | 'type'
  const [typedText, setTypedText] = useState(signatoryName || '')
  const [hasDrawing, setHasDrawing] = useState(false)
  const [consentChecked, setConsentChecked] = useState(false)
  const [rememberSignature, setRememberSignature] = useState(true)
  const drawing = useRef(false)

  useEffect(() => {
    const canvas = canvasRef.current
    canvas.width = canvas.offsetWidth * 2
    canvas.height = canvas.offsetHeight * 2
    const ctx = canvas.getContext('2d')
    ctx.scale(2, 2)
    ctx.strokeStyle = '#16253D'
    ctx.lineWidth = 2.2
    ctx.lineCap = 'round'
  }, [])

  useEffect(() => {
    if (mode === 'type') {
      renderTypedSignature(canvasRef.current, typedText)
      setHasDrawing(!!typedText.trim())
    }
  }, [mode, typedText])

  const getPoint = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    return { x: clientX - rect.left, y: clientY - rect.top }
  }

  const startDraw = (e) => {
    if (mode !== 'draw') return
    e.preventDefault()
    drawing.current = true
    const { x, y } = getPoint(e)
    const ctx = canvasRef.current.getContext('2d')
    ctx.beginPath()
    ctx.moveTo(x, y)
  }
  const moveDraw = (e) => {
    if (mode !== 'draw' || !drawing.current) return
    e.preventDefault()
    const { x, y } = getPoint(e)
    const ctx = canvasRef.current.getContext('2d')
    ctx.lineTo(x, y)
    ctx.stroke()
    setHasDrawing(true)
  }
  const endDraw = () => { drawing.current = false }

  const clearPad = () => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasDrawing(false)
    if (mode === 'type') setTypedText('')
  }

  const useSaved = () => {
    if (!savedSignature?.signature_image) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const img = new Image()
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width / 2, canvas.height / 2)
      setHasDrawing(true)
    }
    img.src = savedSignature.signature_image
  }

  const handleApply = () => {
    if (!hasDrawing || !consentChecked) return
    const dataUrl = canvasRef.current.toDataURL('image/png')
    onSign({
      signatureImage: dataUrl,
      signatoryName: mode === 'type' ? typedText : signatoryName,
      consentAccepted: true,
      userAgent: navigator.userAgent,
    })
    if (rememberSignature && onSaveForReuse) {
      onSaveForReuse(dataUrl, mode === 'type' ? typedText : signatoryName)
    }
  }

  return (
    <div className="border border-line rounded-md p-3 bg-[#FCFBF8]">
      <div className="flex justify-between items-center mb-2">
        <div className="flex gap-1.5">
          <button
            onClick={() => setMode('draw')}
            className={`text-[11px] px-2.5 py-1 rounded border ${mode === 'draw' ? 'bg-navy text-white border-navy' : 'border-line bg-white'}`}
          >
            Draw
          </button>
          <button
            onClick={() => setMode('type')}
            className={`text-[11px] px-2.5 py-1 rounded border ${mode === 'type' ? 'bg-navy text-white border-navy' : 'border-line bg-white'}`}
          >
            Type
          </button>
        </div>
        <div className="flex gap-1.5">
          {savedSignature?.signature_image && (
            <button onClick={useSaved} className="text-[11px] px-2.5 py-1 border border-gold text-gold rounded">
              Use saved signature
            </button>
          )}
          <button onClick={clearPad} className="text-[11px] px-2.5 py-1 border border-line rounded">
            Clear
          </button>
        </div>
      </div>

      {mode === 'type' && (
        <input
          type="text"
          value={typedText}
          onChange={(e) => setTypedText(e.target.value)}
          placeholder="Type your full name"
          className="w-full px-2.5 py-1.5 border border-line rounded text-sm mb-2"
        />
      )}

      <canvas
        ref={canvasRef}
        className="w-full h-24 bg-white border border-line rounded touch-none"
        style={{ touchAction: 'none' }}
        onMouseDown={startDraw}
        onMouseMove={moveDraw}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
        onTouchStart={startDraw}
        onTouchMove={moveDraw}
        onTouchEnd={endDraw}
      />

      <div className="text-[10.5px] text-inksoft mt-2 leading-relaxed">{CONSENT_TEXT}</div>

      <label className="flex items-start gap-2 mt-2 text-xs">
        <input type="checkbox" checked={consentChecked} onChange={(e) => setConsentChecked(e.target.checked)} className="mt-0.5" />
        I agree — this is my legal signature.
      </label>

      {onSaveForReuse && (
        <label className="flex items-center gap-2 mt-1.5 text-[11px] text-inksoft">
          <input type="checkbox" checked={rememberSignature} onChange={(e) => setRememberSignature(e.target.checked)} />
          Remember this signature for next time
        </label>
      )}

      <button
        onClick={handleApply}
        disabled={!hasDrawing || !consentChecked}
        className="w-full bg-navy text-white py-2 rounded text-sm font-medium mt-3 disabled:opacity-40"
      >
        Apply Signature
      </button>
    </div>
  )
}
