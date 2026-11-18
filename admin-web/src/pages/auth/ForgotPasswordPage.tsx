import { useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Loader2, Radar } from 'lucide-react'
import { authApi } from '@/api/endpoints'
import { cn } from '@/lib/utils'

export function ForgotPasswordPage() {
  const emailId = useId()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setError(null)
    setSuccess(null)

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFieldError('Enter a valid email address')
      return
    }
    setFieldError(null)
    setBusy(true)
    try {
      const result = await authApi.forgotPassword(email.trim())
      setSuccess(result.message || 'If the account exists, reset instructions were generated.')
      if (import.meta.env.DEV && result.resetToken) {
        setSuccess(
          `${result.message} Dev reset token: ${result.resetToken}`,
        )
      }
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null
      setError(msg ?? 'Unable to process request. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-shell relative flex min-h-dvh items-center justify-center overflow-x-hidden bg-[#F0F1F5] px-4 py-8 sm:px-6">
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-[28px] bg-white p-8 shadow-[0_24px_80px_rgba(37,37,58,0.12)] sm:p-10">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#5577E8] to-[#4165D9] text-white">
            <Radar className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <p className="font-display text-lg font-bold text-[#25253A]">TrackSense</p>
            <p className="text-xs text-[#8A8A9B]">Password recovery</p>
          </div>
        </div>

        <h1 className="font-display text-2xl font-bold text-[#25253A]">Forgot Password</h1>
        <p className="mt-2 text-sm text-[#8A8A9B]">
          Enter your account email and we will generate a password reset token.
        </p>

        <form onSubmit={(e) => void onSubmit(e)} className="mt-8 space-y-5" noValidate>
          <div className="space-y-2">
            <label htmlFor={emailId} className="block text-sm font-medium text-[#25253A]">
              Email
            </label>
            <input
              id={emailId}
              type="email"
              autoComplete="email"
              value={email}
              disabled={busy}
              onChange={(e) => {
                setEmail(e.target.value)
                if (fieldError) setFieldError(null)
              }}
              className={cn(
                'h-12 w-full rounded-xl border bg-[#F0F1F5] px-4 text-sm text-[#25253A] outline-none transition-all duration-200 placeholder:text-[#8A8A9B]',
                fieldError
                  ? 'border-rose-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-100'
                  : 'border-transparent focus:border-[#5577E8] focus:bg-white focus:ring-4 focus:ring-[#5577E8]/15',
              )}
              placeholder="you@company.com"
            />
            {fieldError ? <p className="text-xs text-rose-500">{fieldError}</p> : null}
          </div>

          {error ? (
            <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-600">
              {error}
            </div>
          ) : null}
          {success ? (
            <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700 break-all">
              {success}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="flex h-12 w-full items-center justify-center rounded-full bg-gradient-to-r from-[#5577E8] to-[#4165D9] text-sm font-semibold uppercase tracking-[0.14em] text-white shadow-[0_12px_28px_rgba(85,119,232,0.35)] transition hover:brightness-105 disabled:opacity-70"
          >
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending…
              </>
            ) : (
              'Send reset link'
            )}
          </button>
        </form>

        <Link
          to="/login"
          className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-[#5577E8] hover:text-[#4165D9]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to login
        </Link>
      </div>
    </div>
  )
}
