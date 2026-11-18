import { useEffect, useRef, useState } from 'react'
import { Check, Layers } from 'lucide-react'
import { MAP_TILE_TYPES } from '@/lib/mapTiles'
import { cn } from '@/lib/utils'

export function MapLayersControl({
  value,
  onChange,
  className,
}: {
  value: string
  onChange: (id: string) => void
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  return (
    <div ref={rootRef} className={cn('pointer-events-auto absolute right-3 top-3 z-[1000]', className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'inline-flex items-center gap-2 rounded-lg border border-[#2F6BFF] bg-white px-3 py-2 text-sm font-medium text-[#2F6BFF] shadow-sm transition hover:bg-[#F5F8FF]',
          open && 'bg-[#F5F8FF]',
        )}
      >
        <Layers className="h-4 w-4" />
        Layers
      </button>

      {open ? (
        <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-[var(--border)] bg-white shadow-lg">
          <p className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-[#8B94A8]">
            Map type
          </p>
          <ul className="pb-2">
            {MAP_TILE_TYPES.map((tile) => {
              const selected = tile.id === value
              return (
                <li key={tile.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(tile.id)
                      setOpen(false)
                    }}
                    className={cn(
                      'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-[#18213A] transition hover:bg-[#F5F8FF]',
                      selected && 'bg-[#E8FFF6]',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                        selected ? 'border-[#E11D48] bg-[#E11D48] text-white' : 'border-[#C5CCD8] bg-white',
                      )}
                    >
                      {selected ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                    </span>
                    {tile.label}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
