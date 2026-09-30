import { useEffect, useRef, useState } from 'react'
import { Crop, X } from 'lucide-react'

interface Rect {
  x: number
  y: number
  w: number
  h: number
}

// Plain-canvas drag-to-select crop — no external cropper library. The
// user drags a rectangle over the displayed (scaled-down) preview; on
// confirm, that rectangle is mapped back to the image's natural pixel size
// and drawn onto an offscreen canvas, which is exported as a new File (same
// name/type as the original) via canvas.toBlob. This runs entirely client-
// side before the real upload (useUploadExpenseReportDocument) — the crop
// itself has nothing to do with the backend, it just changes what bytes get
// sent as the uploaded file.
export function ImageCropModal({ file, onCancel, onConfirm }: { file: File; onCancel: () => void; onConfirm: (cropped: File) => void }) {
  const imgRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 })
  const [displaySize, setDisplaySize] = useState({ w: 0, h: 0 })
  const [rect, setRect] = useState<Rect | null>(null)
  const dragStart = useRef<{ x: number; y: number } | null>(null)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [file])

  function onImgLoad() {
    const img = imgRef.current
    if (!img) return
    setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight })
    setDisplaySize({ w: img.clientWidth, h: img.clientHeight })
  }

  function pointerPos(e: React.PointerEvent) {
    const box = containerRef.current?.getBoundingClientRect()
    if (!box) return { x: 0, y: 0 }
    return {
      x: Math.min(Math.max(e.clientX - box.left, 0), displaySize.w),
      y: Math.min(Math.max(e.clientY - box.top, 0), displaySize.h),
    }
  }

  function onPointerDown(e: React.PointerEvent) {
    const p = pointerPos(e)
    dragStart.current = p
    setRect({ x: p.x, y: p.y, w: 0, h: 0 })
    ;(e.target as Element).setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragStart.current) return
    const p = pointerPos(e)
    const start = dragStart.current
    setRect({ x: Math.min(start.x, p.x), y: Math.min(start.y, p.y), w: Math.abs(p.x - start.x), h: Math.abs(p.y - start.y) })
  }

  function onPointerUp() {
    dragStart.current = null
  }

  async function handleConfirm(useCrop: boolean) {
    const img = imgRef.current
    if (!img) return
    setExporting(true)
    try {
      const scaleX = naturalSize.w / displaySize.w
      const scaleY = naturalSize.h / displaySize.h
      const src = useCrop && rect && rect.w > 4 && rect.h > 4 ? rect : { x: 0, y: 0, w: displaySize.w, h: displaySize.h }
      const sx = Math.round(src.x * scaleX)
      const sy = Math.round(src.y * scaleY)
      const sw = Math.round(src.w * scaleX)
      const sh = Math.round(src.h * scaleY)

      const canvas = document.createElement('canvas')
      canvas.width = sw
      canvas.height = sh
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas not supported.')
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh)

      const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, file.type || 'image/png', 0.92))
      if (!blob) throw new Error('Could not export the cropped image.')
      const cropped = new File([blob], file.name, { type: file.type || 'image/png' })
      onConfirm(cropped)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <div className="bg-surface-alt rounded-xl border border-border shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-text!">
            <Crop size={15} className="text-brand" /> Crop image before upload
          </h3>
          <button type="button" onClick={onCancel} className="text-text-faint hover:text-text">
            <X size={16} />
          </button>
        </div>

        <div className="p-4">
          <p className="text-xs text-text-faint mb-2">Drag on the image to select the area to keep, or upload it as-is.</p>
          <div
            ref={containerRef}
            className="relative inline-block select-none touch-none cursor-crosshair border border-border rounded-md overflow-hidden max-w-full"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          >
            {url && (
              // eslint-disable-next-line jsx-a11y/alt-text
              <img ref={imgRef} src={url} onLoad={onImgLoad} className="max-w-full max-h-[60vh] block pointer-events-none" draggable={false} />
            )}
            {rect && rect.w > 2 && rect.h > 2 && (
              <div
                className="absolute border-2 border-brand bg-brand/10 pointer-events-none"
                style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
              />
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border">
          <button type="button" onClick={onCancel} className="rounded-lg border border-border px-3.5 py-2 text-sm font-medium text-text hover:bg-surface-hover">
            Cancel
          </button>
          <button
            type="button"
            disabled={exporting}
            onClick={() => handleConfirm(false)}
            className="rounded-lg border border-border px-3.5 py-2 text-sm font-medium text-text hover:bg-surface-hover disabled:opacity-50"
          >
            Upload without cropping
          </button>
          <button
            type="button"
            disabled={exporting || !rect || rect.w <= 4 || rect.h <= 4}
            onClick={() => handleConfirm(true)}
            className="rounded-lg bg-brand px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting ? 'Cropping…' : 'Crop & Upload'}
          </button>
        </div>
      </div>
    </div>
  )
}
