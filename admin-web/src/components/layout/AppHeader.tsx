import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import {
  Bell,
  CheckCheck,
  ChevronDown,
  Globe2,
  KeyRound,
  LogOut,
  Menu,
  Moon,
  Search,
  Settings,
  Sun,
  User,
  X,
} from 'lucide-react'
import { alertsApi, customersApi, devicesApi, lookupApi, tripsApi, vehiclesApi } from '@/api/endpoints'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn, formatDate } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'
import { useUiStore } from '@/stores/uiStore'

function useDebouncedValue<T>(value: T, delay = 280) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(t)
  }, [value, delay])
  return debounced
}

export function AppHeader() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const { setMode, resolved } = useThemeStore()
  const { globalSearch, setGlobalSearch, countryId, setCountryId, toggleMobileNav } = useUiStore()

  const [searchOpen, setSearchOpen] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const searchWrapRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const debouncedSearch = useDebouncedValue(globalSearch.trim(), 300)
  const canSearch = debouncedSearch.length >= 2

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setMobileSearchOpen(true)
        setSearchOpen(true)
        window.setTimeout(() => searchInputRef.current?.focus(), 0)
      }
      if (e.key === 'Escape') setSearchOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const { data: countries = [] } = useQuery({ queryKey: ['countries'], queryFn: lookupApi.countries })
  const { data: alertsData, refetch: refetchAlerts } = useQuery({
    queryKey: ['alerts-header'],
    queryFn: () => alertsApi.list({ limit: 8, page: 1 }),
    refetchInterval: 60_000,
  })

  const customersQ = useQuery({
    queryKey: ['header-search-customers', debouncedSearch],
    queryFn: () => customersApi.list({ q: debouncedSearch, limit: 5, page: 1 }),
    enabled: canSearch && searchOpen,
  })
  const vehiclesQ = useQuery({
    queryKey: ['header-search-vehicles', debouncedSearch],
    queryFn: () => vehiclesApi.list({ q: debouncedSearch, limit: 5, page: 1 }),
    enabled: canSearch && searchOpen,
  })
  const devicesQ = useQuery({
    queryKey: ['header-search-devices', debouncedSearch],
    queryFn: () => devicesApi.list({ q: debouncedSearch, limit: 5, page: 1 }),
    enabled: canSearch && searchOpen,
  })
  const tripsQ = useQuery({
    queryKey: ['header-search-trips', debouncedSearch],
    queryFn: () => tripsApi.list({ q: debouncedSearch, limit: 5, page: 1 }),
    enabled: canSearch && searchOpen,
  })

  const markRead = useMutation({
    mutationFn: (id: string) => alertsApi.markRead(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['alerts-header'] })
      await qc.invalidateQueries({ queryKey: ['alerts'] })
    },
  })
  const markAllRead = useMutation({
    mutationFn: () => alertsApi.markAllRead(),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['alerts-header'] })
      await qc.invalidateQueries({ queryKey: ['alerts'] })
    },
  })

  const unread = useMemo(
    () => alertsData?.items?.filter((a) => !a.isRead).length ?? 0,
    [alertsData],
  )
  const selectedCountry = countries.find((c) => c._id === countryId)

  const initials =
    user?.fullName
      ?.split(' ')
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() ??
    user?.username?.slice(0, 2).toUpperCase() ??
    'TS'

  const customerHits = customersQ.data?.items ?? []
  const vehicleHits = vehiclesQ.data?.items ?? []
  const deviceHits = devicesQ.data?.items ?? []
  const tripHits = tripsQ.data?.items ?? []
  const hasResults =
    customerHits.length + vehicleHits.length + deviceHits.length + tripHits.length > 0
  const searching = customersQ.isFetching || vehiclesQ.isFetching || devicesQ.isFetching || tripsQ.isFetching

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!searchWrapRef.current?.contains(e.target as Node)) setSearchOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  function toggleTheme() {
    setMode(resolved === 'dark' ? 'light' : 'dark')
  }

  function go(path: string) {
    setSearchOpen(false)
    setMobileSearchOpen(false)
    navigate(path)
  }

  const searchField = (
    <div ref={searchWrapRef} className="relative w-full max-w-[520px] flex-1">
      <div
        className={cn(
          'group flex h-11 items-center gap-2 rounded-2xl border bg-[#F8FAFF] px-3.5 transition-all dark:bg-[var(--input-bg)]',
          'border-[#E5EAF4] hover:border-[#C9D4F0]',
          'focus-within:border-[#5577E8] focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(85,119,232,0.12)] dark:focus-within:bg-[var(--card)]',
        )}
      >
        <Search className="h-4 w-4 shrink-0 text-[#64748B]" aria-hidden />
        <input
          ref={searchInputRef}
          value={globalSearch}
          onChange={(e) => {
            setGlobalSearch(e.target.value)
            setSearchOpen(true)
          }}
          onFocus={() => setSearchOpen(true)}
          placeholder="Search vehicles, plates, IMEI, customers… (Ctrl + K)"
          className="h-full w-full border-0 bg-transparent text-sm text-[#18213A] outline-none placeholder:text-[#94A3B8] dark:text-[var(--foreground)]"
          aria-label="Global search"
        />
        {globalSearch ? (
          <button
            type="button"
            className="flex h-6 w-6 items-center justify-center rounded-full text-[#64748B] transition hover:bg-[#EEF2FF] hover:text-[#5577E8]"
            onClick={() => {
              setGlobalSearch('')
              setSearchOpen(false)
            }}
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      {searchOpen && canSearch ? (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-2xl border border-[#E5EAF4] bg-white shadow-[0_16px_40px_rgba(23,37,84,0.12)] dark:border-[var(--border)] dark:bg-[var(--card)]">
          <div className="max-h-[420px] overflow-y-auto p-2">
            {searching && !hasResults ? (
              <p className="px-3 py-6 text-center text-sm text-[#64748B]">Searching…</p>
            ) : !hasResults ? (
              <p className="px-3 py-6 text-center text-sm text-[#64748B]">
                No matches for “{debouncedSearch}”
              </p>
            ) : (
              <div className="space-y-3">
                {customerHits.length ? (
                  <SearchGroup title="Customers">
                    {customerHits.map((c) => (
                      <SearchHit
                        key={c._id}
                        label={c.companyName || c.contactName}
                        meta={c.email}
                        onClick={() => go(`/customers/${c._id}`)}
                      />
                    ))}
                  </SearchGroup>
                ) : null}
                {vehicleHits.length ? (
                  <SearchGroup title="Vehicles">
                    {vehicleHits.map((v) => (
                      <SearchHit
                        key={v._id}
                        label={v.name}
                        meta={v.plateNumber}
                        onClick={() => go(`/vehicles/${v._id}`)}
                      />
                    ))}
                  </SearchGroup>
                ) : null}
                {deviceHits.length ? (
                  <SearchGroup title="GPS Devices">
                    {deviceHits.map((d) => (
                      <SearchHit
                        key={d._id}
                        label={d.name || 'Device'}
                        meta={d.imei}
                        onClick={() => go(`/devices/${d._id}`)}
                      />
                    ))}
                  </SearchGroup>
                ) : null}
                {tripHits.length ? (
                  <SearchGroup title="Trips">
                    {tripHits.map((t) => (
                      <SearchHit
                        key={t._id}
                        label={typeof t.vehicleId === 'object' && t.vehicleId ? t.vehicleId.name : 'Trip'}
                        meta={formatDate(t.startTime)}
                        onClick={() => go(`/trips/${t._id}`)}
                      />
                    ))}
                  </SearchGroup>
                ) : null}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )

  return (
    <TooltipProvider delayDuration={200}>
      <header className="sticky top-0 z-30 border-b border-[#E5EAF4] bg-white/95 backdrop-blur-md dark:border-[var(--border)] dark:bg-[var(--card)]/95">
        <div className="flex h-[76px] items-center gap-3 px-4 sm:gap-4 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0 rounded-xl text-[#64748B] hover:bg-[#EEF2FF] hover:text-[#5577E8] lg:hidden"
            onClick={toggleMobileNav}
            aria-label="Open navigation"
            aria-controls="app-sidebar"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Desktop / tablet search */}
          <div className="hidden min-w-0 flex-1 md:block">{searchField}</div>

          {/* Mobile search toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-xl text-[#64748B] hover:bg-[#EEF2FF] hover:text-[#5577E8] md:hidden"
            onClick={() => setMobileSearchOpen((v) => !v)}
            aria-label="Search"
          >
            {mobileSearchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
          </Button>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            {/* Country */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="hidden h-11 items-center gap-2 rounded-2xl border border-[#E5EAF4] bg-[#F8FAFF] px-3 text-sm font-medium text-[#18213A] transition hover:border-[#C9D4F0] hover:bg-white dark:border-[var(--border)] dark:bg-[var(--input-bg)] dark:text-[var(--foreground)] md:inline-flex"
                >
                  {selectedCountry?.flagUrl ? (
                    <img src={selectedCountry.flagUrl} alt="" className="h-4 w-6 rounded-sm object-cover" />
                  ) : (
                    <Globe2 className="h-4 w-4 text-[#5577E8]" />
                  )}
                  <span className="max-w-[120px] truncate">
                    {selectedCountry?.name ?? 'All countries'}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-[#64748B]" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="max-h-80 w-64 overflow-y-auto p-1.5">
                <DropdownMenuLabel>Select country</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className={cn(!countryId && 'bg-[#EEF2FF] text-[#4165D9]')}
                  onClick={() => setCountryId(null)}
                >
                  <Globe2 className="h-4 w-4" />
                  All countries
                  {!countryId ? <CheckCheck className="ml-auto h-3.5 w-3.5" /> : null}
                </DropdownMenuItem>
                {countries.map((c) => (
                  <DropdownMenuItem
                    key={c._id}
                    className={cn(countryId === c._id && 'bg-[#EEF2FF] text-[#4165D9]')}
                    onClick={() => setCountryId(c._id)}
                  >
                    {c.flagUrl ? (
                      <img src={c.flagUrl} alt="" className="h-3.5 w-5 rounded-sm object-cover" />
                    ) : (
                      <span className="flex h-3.5 w-5 items-center justify-center text-[10px] font-semibold text-[#64748B]">
                        {(c.isoAlpha2 || c.code || '??').slice(0, 2)}
                      </span>
                    )}
                    <span className="truncate">{c.name}</span>
                    {countryId === c._id ? <CheckCheck className="ml-auto h-3.5 w-3.5" /> : null}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Notifications */}
            <DropdownMenu
              onOpenChange={(open) => {
                if (open) void refetchAlerts()
              }}
            >
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-transparent text-[#64748B] transition hover:border-[#E5EAF4] hover:bg-[#EEF2FF] hover:text-[#5577E8]"
                  aria-label="Notifications"
                >
                  <Bell className="h-5 w-5" />
                  {unread > 0 ? (
                    <span className="absolute right-1.5 top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#E11D48] px-1 text-[10px] font-bold leading-none text-white shadow-sm">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  ) : null}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[360px] p-0">
                <div className="flex items-center justify-between border-b border-[#E5EAF4] px-4 py-3 dark:border-[var(--border)]">
                  <div>
                    <p className="font-display text-sm font-semibold text-[#18213A] dark:text-[var(--foreground)]">
                      Notifications
                    </p>
                    <p className="text-xs text-[#64748B]">
                      {unread > 0 ? `${unread} unread` : 'You are up to date'}
                    </p>
                  </div>
                  {unread > 0 ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs text-[#5577E8]"
                      disabled={markAllRead.isPending}
                      onClick={() => markAllRead.mutate()}
                    >
                      Mark all read
                    </Button>
                  ) : null}
                </div>
                <div className="max-h-[320px] overflow-y-auto p-2">
                  {!alertsData?.items?.length ? (
                    <p className="px-3 py-8 text-center text-sm text-[#64748B]">No notifications yet.</p>
                  ) : (
                    alertsData.items.map((alert) => (
                      <button
                        key={alert._id}
                        type="button"
                        className={cn(
                          'mb-1 flex w-full flex-col gap-1 rounded-xl px-3 py-2.5 text-left transition hover:bg-[#F5F7FC] dark:hover:bg-[var(--background)]',
                          !alert.isRead && 'bg-[#EEF2FF]/70 dark:bg-[var(--primary-soft)]/40',
                        )}
                        onClick={() => {
                          if (!alert.isRead) markRead.mutate(alert._id)
                          navigate('/alerts')
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-[#18213A] dark:text-[var(--foreground)]">
                            {alert.title || alert.type}
                          </p>
                          {!alert.isRead ? (
                            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#5577E8]" />
                          ) : null}
                        </div>
                        <p className="line-clamp-2 text-xs text-[#64748B]">{alert.message}</p>
                        <p className="text-[11px] text-[#94A3B8]">{formatDate(alert.createdAt)}</p>
                      </button>
                    ))
                  )}
                </div>
                <div className="border-t border-[#E5EAF4] p-2 dark:border-[var(--border)]">
                  <Button variant="secondary" className="w-full" asChild>
                    <Link to="/alerts">View all notifications</Link>
                  </Button>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Theme */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="flex h-11 w-11 items-center justify-center rounded-2xl border border-transparent text-[#64748B] transition hover:border-[#E5EAF4] hover:bg-[#EEF2FF] hover:text-[#5577E8]"
                  aria-label={resolved === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  {resolved === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {resolved === 'dark' ? 'Light mode' : 'Dark mode'}
              </TooltipContent>
            </Tooltip>

            {/* Profile */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex h-11 items-center gap-2.5 rounded-2xl border border-[#E5EAF4] bg-white py-1 pl-1 pr-3 shadow-[0_1px_2px_rgba(23,37,84,0.04)] transition hover:border-[#C9D4F0] hover:bg-[#F8FAFF] dark:border-[var(--border)] dark:bg-[var(--card)] dark:hover:bg-[var(--background)]"
                >
                  <Avatar className="h-9 w-9 border border-[#E5EAF4]">
                    <AvatarImage src={user?.avatarUrl} alt={user?.username} />
                    <AvatarFallback className="bg-[#EEF2FF] text-xs font-semibold text-[#4165D9]">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden min-w-0 text-left lg:block">
                    <p className="truncate text-sm font-semibold leading-tight text-[#18213A] dark:text-[var(--foreground)]">
                      {user?.fullName ?? user?.username}
                    </p>
                    <p className="truncate text-xs capitalize text-[#64748B]">
                      {user?.role?.replace('_', ' ')}
                    </p>
                  </div>
                  <ChevronDown className="hidden h-3.5 w-3.5 text-[#64748B] sm:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60 p-1.5">
                <div className="px-2 py-2">
                  <p className="truncate text-sm font-semibold">{user?.fullName ?? user?.username}</p>
                  <p className="truncate text-xs text-[#64748B]">{user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/settings" className="cursor-pointer">
                    <User className="h-4 w-4 text-[#5577E8]" />
                    My Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/settings" className="cursor-pointer">
                    <Settings className="h-4 w-4 text-[#5577E8]" />
                    Account Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/settings#password" className="cursor-pointer">
                    <KeyRound className="h-4 w-4 text-[#5577E8]" />
                    Change Password
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-[#E11D48] focus:bg-rose-50 focus:text-[#E11D48]"
                  onClick={() => void logout()}
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {mobileSearchOpen ? (
          <div className="border-t border-[#E5EAF4] px-4 py-3 md:hidden dark:border-[var(--border)]">
            {searchField}
          </div>
        ) : null}
      </header>
    </TooltipProvider>
  )
}

function SearchGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#94A3B8]">
        {title}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  )
}

function SearchHit({
  label,
  meta,
  onClick,
}: {
  label: string
  meta?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full flex-col rounded-xl px-3 py-2 text-left transition hover:bg-[#EEF2FF] dark:hover:bg-[var(--background)]"
    >
      <span className="truncate text-sm font-medium text-[#18213A] dark:text-[var(--foreground)]">{label}</span>
      {meta ? <span className="truncate text-xs text-[#64748B]">{meta}</span> : null}
    </button>
  )
}
