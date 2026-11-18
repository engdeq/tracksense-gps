import { useId, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2, Radar } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const login = useAuthStore((s) => s.login)
  const isLoading = useAuthStore((s) => s.isLoading)
  const formRef = useRef<HTMLFormElement>(null)
  const usernameId = useId()
  const passwordId = useId()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; password?: string }>({})
  const [submitting, setSubmitting] = useState(false)

  const busy = isLoading || submitting

  function validate() {
    const next: { username?: string; password?: string } = {}
    if (!username.trim()) next.username = 'Username is required'
    else if (username.trim().length < 3) next.username = 'Enter at least 3 characters'
    if (!password) next.password = 'Password is required'
    else if (password.length < 6) next.password = 'Password must be at least 6 characters'
    setFieldErrors(next)
    return Object.keys(next).length === 0
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setError(null)
    if (!validate()) return

    setSubmitting(true)
    try {
      await login(username.trim(), password)
      const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/'
      navigate(from, { replace: true })
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null
      setError(msg ?? 'Invalid username or password')
    } finally {
      setSubmitting(false)
    }
  }

  function focusLoginForm() {
    formRef.current?.querySelector<HTMLInputElement>('input')?.focus()
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <div className="auth-shell">
      <div className="auth-shell-bg" aria-hidden />

      <div className="auth-card">
        {/* LEFT — Login form */}
        <section className="auth-form-panel">
          <div className="auth-form-inner">
            <div className="mb-8 flex items-center gap-3.5 lg:mb-9">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#5577E8] to-[#4165D9] text-white shadow-md shadow-[#5577E8]/30">
                <Radar className="h-6 w-6" aria-hidden />
              </div>
              <div>
                <p className="font-display text-xl font-bold tracking-tight text-[#25253A]">TrackSense</p>
                <p className="text-xs text-[#8A8A9B]">Fleet intelligence</p>
              </div>
            </div>

            <h1 className="font-display text-[2.15rem] font-bold leading-none tracking-tight text-[#25253A] sm:text-[2.35rem]">
              Login
            </h1>
            <p className="mt-3 text-[0.95rem] text-[#8A8A9B]">Login to your account.</p>

            <form ref={formRef} onSubmit={(e) => void onSubmit(e)} className="mt-8 space-y-5 lg:mt-9" noValidate>
              <div className="space-y-2">
                <label htmlFor={usernameId} className="block text-sm font-medium text-[#25253A]">
                  Username
                </label>
                <input
                  id={usernameId}
                  name="username"
                  autoComplete="username"
                  value={username}
                  disabled={busy}
                  onChange={(e) => {
                    setUsername(e.target.value)
                    if (fieldErrors.username) setFieldErrors((f) => ({ ...f, username: undefined }))
                  }}
                  className={cn(
                    'auth-input h-[52px] w-full rounded-xl border bg-[#F0F1F5] px-4 text-[0.95rem] text-[#25253A] outline-none transition-all duration-200 placeholder:text-[#8A8A9B]',
                    fieldErrors.username
                      ? 'border-rose-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-100'
                      : 'border-transparent focus:border-[#5577E8] focus:bg-white focus:ring-4 focus:ring-[#5577E8]/15',
                  )}
                  placeholder="Enter your username"
                  aria-invalid={Boolean(fieldErrors.username)}
                />
                {fieldErrors.username ? (
                  <p className="text-xs text-rose-500">{fieldErrors.username}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor={passwordId} className="block text-sm font-medium text-[#25253A]">
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-xs font-medium text-[#5577E8] transition hover:text-[#4165D9]"
                  >
                    Forgot Password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    id={passwordId}
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    disabled={busy}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      if (fieldErrors.password) setFieldErrors((f) => ({ ...f, password: undefined }))
                    }}
                    className={cn(
                      'auth-input h-[52px] w-full rounded-xl border bg-[#F0F1F5] px-4 pr-12 text-[0.95rem] text-[#25253A] outline-none transition-all duration-200 placeholder:text-[#8A8A9B]',
                      fieldErrors.password
                        ? 'border-rose-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-100'
                        : 'border-transparent focus:border-[#5577E8] focus:bg-white focus:ring-4 focus:ring-[#5577E8]/15',
                    )}
                    placeholder="Enter your password"
                    aria-invalid={Boolean(fieldErrors.password)}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-[#8A8A9B] transition hover:bg-white/80 hover:text-[#25253A]"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {fieldErrors.password ? (
                  <p className="text-xs text-rose-500">{fieldErrors.password}</p>
                ) : null}
              </div>

              {error ? (
                <div
                  role="alert"
                  className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-600"
                >
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={busy}
                className="auth-login-btn relative mt-1 flex h-[52px] w-full items-center justify-center rounded-full bg-gradient-to-r from-[#5577E8] to-[#4165D9] text-sm font-semibold uppercase tracking-[0.14em] text-white shadow-[0_12px_28px_rgba(85,119,232,0.35)] transition hover:brightness-105 hover:shadow-[0_16px_34px_rgba(65,101,217,0.4)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#5577E8]/30 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {busy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in…
                  </>
                ) : (
                  'Login'
                )}
              </button>
            </form>
          </div>
        </section>

        {/* RIGHT — Welcome panel */}
        <aside className="auth-welcome">
          <div className="auth-welcome-curve" aria-hidden />
          <div className="auth-blob auth-blob-a" aria-hidden />
          <div className="auth-blob auth-blob-b" aria-hidden />
          <div className="auth-blob auth-blob-c" aria-hidden />

          <div className="auth-welcome-content">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/70">TrackSense</p>
            <h2 className="mt-5 font-display text-[2.45rem] font-bold leading-[1.1] tracking-tight xl:text-[2.75rem]">
              Welcome Back!
            </h2>
            <p className="mt-5 max-w-[300px] text-[0.95rem] leading-relaxed text-white/80">
              Already have an account? Sign in and continue your journey.
            </p>
            <button
              type="button"
              onClick={focusLoginForm}
              className="mt-11 h-[52px] min-w-[180px] rounded-full border-2 border-white/90 bg-transparent px-8 text-sm font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-white hover:text-[#4165D9] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30"
            >
              Login
            </button>
          </div>
        </aside>

        {/* Mobile welcome strip */}
        <div className="auth-welcome-mobile">
          <p className="font-display text-xl font-bold">Welcome Back!</p>
          <p className="mt-1.5 text-sm text-white/80">Sign in and continue your journey with TrackSense.</p>
        </div>
      </div>
    </div>
  )
}
