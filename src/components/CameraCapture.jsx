import { useEffect, useRef, useState } from 'react'

export default function CameraCapture({ onCapture, onClose }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const [error, setError] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
        setReady(true)
      } catch (err) {
        setError(
          err.name === 'NotAllowedError'
            ? 'Camera permission was denied. Allow camera access in your browser, or use "Upload File" instead.'
            : 'Could not access a camera on this device. Use "Upload File" instead.'
        )
      }
    }
    start()
    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  const capture = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    const stamp = new Date()
    const fileName = `Photo_${stamp.toISOString().replace(/[:.]/g, '-')}.jpg`
    onCapture({ dataUrl, fileName, capturedAt: stamp.toISOString() })
  }

  const handleClose = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-6">
      <div className="bg-white rounded-lg p-5 w-full max-w-md">
        <div className="flex justify-between items-center mb-3">
          <div className="font-display text-lg font-semibold text-navy">Capture Evidence Photo</div>
          <button onClick={handleClose} className="text-inksoft text-xl leading-none">×</button>
        </div>

        {error ? (
          <div className="text-sm text-major bg-majorbg border border-major rounded p-3">{error}</div>
        ) : (
          <div className="relative bg-black rounded overflow-hidden aspect-[4/3] flex items-center justify-center">
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
            {!ready && <div className="absolute text-white text-xs">Starting camera…</div>}
          </div>
        )}
        <canvas ref={canvasRef} className="hidden" />

        <div className="flex justify-end gap-2 mt-4">
          <button onClick={handleClose} className="px-4 py-2 text-sm border border-line rounded text-navy">
            Cancel
          </button>
          {!error && (
            <button
              onClick={capture}
              disabled={!ready}
              className="px-4 py-2 text-sm bg-navy text-white rounded disabled:opacity-40"
            >
              📷 Capture
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
