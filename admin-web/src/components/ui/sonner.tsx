import { Toaster as Sonner, type ToasterProps } from 'sonner'
import { useThemeStore } from '@/stores/themeStore'

export function Toaster({ ...props }: ToasterProps) {
  const resolved = useThemeStore((s) => s.resolved)
  return (
    <Sonner
      theme={resolved === 'dark' ? 'dark' : 'light'}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-[var(--card)] group-[.toaster]:text-[var(--foreground)] group-[.toaster]:border-[var(--border)] group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-[var(--muted)]',
          actionButton: 'group-[.toast]:bg-[var(--primary)] group-[.toast]:text-white',
          cancelButton: 'group-[.toast]:bg-[var(--background)]',
        },
      }}
      {...props}
    />
  )
}