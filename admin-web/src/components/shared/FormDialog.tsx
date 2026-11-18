import type { ReactNode } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'

export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  onSubmit,
  loading,
  submitLabel = 'Save',
  size = 'lg',
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
  onSubmit: () => void | Promise<void>
  loading?: boolean
  submitLabel?: string
  size?: 'md' | 'lg' | 'xl' | 'full'
}) {
  const maxW =
    size === 'md' ? 'max-w-lg' : size === 'xl' ? 'max-w-4xl' : size === 'full' ? 'max-w-6xl' : 'max-w-2xl'
  const scrollMax = size === 'full' ? 'max-h-[78vh]' : 'max-h-[65vh]'
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${maxW} gap-0 overflow-hidden p-0`}>
        <div className="h-1.5 w-full bg-gradient-to-r from-[#5577E8] to-[#4165D9]" />
        <DialogHeader className="border-b border-[var(--border)] bg-[var(--primary-soft)]/40 px-6 py-4">
          <DialogTitle className="text-[var(--foreground)]">{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <ScrollArea className={`${scrollMax} px-6 py-5`}>{children}</ScrollArea>
        <DialogFooter className="border-t border-[var(--border)] bg-[var(--card)] px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button disabled={loading} onClick={() => void onSubmit()}>
            {loading ? 'Saving…' : submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
