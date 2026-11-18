import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { appSettingsApi, usersApi } from '@/api/endpoints'
import { PageHeader } from '@/components/shared/PageHeader'
import { ErrorBlock, LoadingBlock } from '@/components/shared/page-states'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useThemeStore } from '@/stores/themeStore'

type AppSettingsPayload = {
  general: {
    name: string
    description: string
    logoUrl: string
    supportEmail: string
    supportPhone: string
  }
  localization: {
    language: string
    timezone: string
    dateFormat: string
    timeFormat: string
    currency: string
  }
  notifications: {
    email: boolean
    push: boolean
    systemAlerts: boolean
  }
  appearance: {
    defaultTheme: string
    primaryColor: string
    sidebarStyle: string
  }
  system: {
    sessionTimeoutMinutes: number
    paginationDefault: number
    maintenanceMode: boolean
  }
}

const emptySettings: AppSettingsPayload = {
  general: {
    name: '',
    description: '',
    logoUrl: '',
    supportEmail: '',
    supportPhone: '',
  },
  localization: {
    language: 'en',
    timezone: 'Asia/Riyadh',
    dateFormat: 'YYYY-MM-DD',
    timeFormat: '24h',
    currency: 'SAR',
  },
  notifications: {
    email: true,
    push: false,
    systemAlerts: true,
  },
  appearance: {
    defaultTheme: 'system',
    primaryColor: '#5577E8',
    sidebarStyle: 'navy',
  },
  system: {
    sessionTimeoutMinutes: 60,
    paginationDefault: 20,
    maintenanceMode: false,
  },
}

export function SettingsPage() {
  const qc = useQueryClient()
  const mode = useThemeStore((s) => s.mode)
  const resolved = useThemeStore((s) => s.resolved)
  const setMode = useThemeStore((s) => s.setMode)
  const [settings, setSettings] = useState<AppSettingsPayload>(emptySettings)
  const [pwd, setPwd] = useState({ currentPassword: '', newPassword: '' })
  const [pwdMsg, setPwdMsg] = useState<string | null>(null)

  const loaded = useQuery({
    queryKey: ['admin-app-settings'],
    queryFn: () => appSettingsApi.get() as Promise<AppSettingsPayload>,
  })

  useEffect(() => {
    if (loaded.data) {
      setSettings({
        general: { ...emptySettings.general, ...loaded.data.general },
        localization: { ...emptySettings.localization, ...loaded.data.localization },
        notifications: { ...emptySettings.notifications, ...loaded.data.notifications },
        appearance: { ...emptySettings.appearance, ...loaded.data.appearance },
        system: { ...emptySettings.system, ...loaded.data.system },
      })
    }
  }, [loaded.data])

  const save = useMutation({
    mutationFn: () => appSettingsApi.update(settings as unknown as Record<string, unknown>),
    onSuccess: async () => {
      toast.success('Application settings saved')
      await qc.invalidateQueries({ queryKey: ['admin-app-settings'] })
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null
      toast.error(msg ?? 'Could not save settings')
    },
  })

  if (loaded.isLoading) return <LoadingBlock label="Loading application settings…" />
  if (loaded.isError) {
    return <ErrorBlock message="Could not load application settings." onRetry={() => void loaded.refetch()} />
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="App Settings"
        description="Brand, localization, notifications, and system defaults for TrackSense."
        breadcrumbs={[{ label: 'System Configuration' }, { label: 'App Settings' }]}
        actions={
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? 'Saving…' : 'Save all sections'}
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">General</CardTitle>
            <CardDescription>Application identity and support contacts.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(
              [
                ['name', 'Application name'],
                ['description', 'Description'],
                ['logoUrl', 'Logo URL'],
                ['supportEmail', 'Support email'],
                ['supportPhone', 'Support phone'],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="space-y-1.5">
                <Label>{label}</Label>
                <Input
                  value={settings.general[key]}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, general: { ...s.general, [key]: e.target.value } }))
                  }
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Localization</CardTitle>
            <CardDescription>Language, timezone, and formatting defaults.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(
              [
                ['language', 'Language'],
                ['timezone', 'Timezone'],
                ['dateFormat', 'Date format'],
                ['timeFormat', 'Time format'],
                ['currency', 'Currency'],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="space-y-1.5">
                <Label>{label}</Label>
                <Input
                  value={settings.localization[key]}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, localization: { ...s.localization, [key]: e.target.value } }))
                  }
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notifications</CardTitle>
            <CardDescription>Channels used for system and fleet alerts.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(
              [
                ['email', 'Email notifications'],
                ['push', 'Push notifications'],
                ['systemAlerts', 'System alerts'],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between rounded-xl border border-[var(--border)] px-3 py-2">
                <Label>{label}</Label>
                <Switch
                  checked={settings.notifications[key]}
                  onCheckedChange={(v) =>
                    setSettings((s) => ({ ...s, notifications: { ...s.notifications, [key]: v } }))
                  }
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Appearance</CardTitle>
            <CardDescription>Theme defaults and brand color tokens.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-[var(--border)] px-3 py-2">
              <div>
                <p className="font-medium">Dark mode</p>
                <p className="text-sm text-[var(--muted)]">
                  Mode: {mode} · Resolved: {resolved}
                </p>
              </div>
              <Switch
                checked={resolved === 'dark'}
                onCheckedChange={(checked) => setMode(checked ? 'dark' : 'light')}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Default theme</Label>
              <Select
                value={settings.appearance.defaultTheme}
                onValueChange={(v) =>
                  setSettings((s) => ({ ...s, appearance: { ...s.appearance, defaultTheme: v } }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">System</SelectItem>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Primary color</Label>
              <Input
                value={settings.appearance.primaryColor}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, appearance: { ...s.appearance, primaryColor: e.target.value } }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Sidebar style</Label>
              <Input
                value={settings.appearance.sidebarStyle}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, appearance: { ...s.appearance, sidebarStyle: e.target.value } }))
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">System</CardTitle>
            <CardDescription>Session and maintenance controls.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>Session timeout (minutes)</Label>
              <Input
                type="number"
                value={settings.system.sessionTimeoutMinutes}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    system: { ...s.system, sessionTimeoutMinutes: Number(e.target.value) || 0 },
                  }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Default pagination</Label>
              <Input
                type="number"
                value={settings.system.paginationDefault}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    system: { ...s.system, paginationDefault: Number(e.target.value) || 0 },
                  }))
                }
              />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-[var(--border)] px-3 py-2">
              <Label>Maintenance mode</Label>
              <Switch
                checked={settings.system.maintenanceMode}
                onCheckedChange={(v) =>
                  setSettings((s) => ({ ...s, system: { ...s.system, maintenanceMode: v } }))
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card id="password">
          <CardHeader>
            <CardTitle className="text-base">Change password</CardTitle>
            <CardDescription>Update the signed-in administrator password.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>Current password</Label>
              <Input
                type="password"
                value={pwd.currentPassword}
                onChange={(e) => setPwd((p) => ({ ...p, currentPassword: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>New password</Label>
              <Input
                type="password"
                value={pwd.newPassword}
                onChange={(e) => setPwd((p) => ({ ...p, newPassword: e.target.value }))}
              />
            </div>
            {pwdMsg ? <p className="text-sm text-[var(--muted)]">{pwdMsg}</p> : null}
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  await usersApi.changePassword(pwd)
                  setPwdMsg('Password updated')
                  setPwd({ currentPassword: '', newPassword: '' })
                  toast.success('Password updated')
                } catch {
                  setPwdMsg('Could not update password')
                  toast.error('Could not update password')
                }
              }}
            >
              Update password
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}