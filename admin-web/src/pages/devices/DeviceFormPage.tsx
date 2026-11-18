import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { customersApi, devicesApi, lookupApi } from '@/api/endpoints'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LoadingBlock, PageHeader } from '@/components/shared/page-states'

export function DeviceFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const qc = useQueryClient()

  const existing = useQuery({
    queryKey: ['device', id],
    queryFn: () => devicesApi.get(id!),
    enabled: isEdit,
  })

  const models = useQuery({ queryKey: ['device-models'], queryFn: lookupApi.deviceModels })
  const protocols = useQuery({ queryKey: ['device-protocols'], queryFn: lookupApi.deviceProtocols })
  const customers = useQuery({ queryKey: ['customers-all'], queryFn: () => customersApi.list({ limit: 200, page: 1 }) })

  const [form, setForm] = useState({
    imei: '',
    name: '',
    deviceModelId: '',
    protocolId: '',
    customerId: '',
    simNumber: '',
    firmwareVersion: '',
    notes: '',
  })

  useEffect(() => {
    if (existing.data) {
      const d = existing.data
      setForm({
        imei: d.imei,
        name: d.name ?? '',
        deviceModelId:
          typeof d.modelId === 'object' && d.modelId
            ? d.modelId._id
            : (d as { deviceModelId?: string }).deviceModelId ?? '',
        protocolId: typeof d.protocolId === 'object' && d.protocolId ? d.protocolId._id : String(d.protocolId ?? ''),
        customerId:
          typeof d.customerId === 'object' && d.customerId
            ? d.customerId._id
            : d.customerId
              ? String(d.customerId)
              : '',
        simNumber: d.simNumber ?? '',
        firmwareVersion: d.firmwareVersion ?? '',
        notes: d.notes ?? '',
      })
    }
  }, [existing.data])

  const save = useMutation({
    mutationFn: async () => {
      const body = { ...form, customerId: form.customerId || null }
      if (isEdit) return devicesApi.update(id!, body)
      return devicesApi.create(body)
    },
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: ['devices'] })
      navigate(isEdit ? `/devices/${id}` : `/devices/${(res as { _id: string })._id}`)
    },
  })

  if (isEdit && existing.isLoading) return <LoadingBlock />

  return (
    <div className="space-y-6">
      <PageHeader
        title={isEdit ? 'Edit device' : 'Register GPS device'}
        description="IMEI registry with model, protocol and customer assignment."
        breadcrumbs={[
          { label: 'GPS Devices', href: '/devices' },
          { label: isEdit ? 'Edit' : 'Register' },
        ]}
      />
      <Card>
        <CardHeader className="border-b border-[var(--border)] bg-gradient-to-r from-[var(--card)] to-[var(--primary-soft)]/50">
          <CardTitle>Device details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-2">
              <Label>IMEI *</Label>
              <Input value={form.imei} onChange={(e) => setForm({ ...form, imei: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Device name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>SIM number</Label>
              <Input value={form.simNumber} onChange={(e) => setForm({ ...form, simNumber: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Model</Label>
              <Select value={form.deviceModelId} onValueChange={(v) => setForm({ ...form, deviceModelId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Model" />
                </SelectTrigger>
                <SelectContent>
                  {(models.data as { _id: string; name: string }[] | undefined)?.map((m) => (
                    <SelectItem key={m._id} value={m._id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Protocol</Label>
              <Select value={form.protocolId} onValueChange={(v) => setForm({ ...form, protocolId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Protocol" />
                </SelectTrigger>
                <SelectContent>
                  {(protocols.data as { _id: string; name: string }[] | undefined)?.map((p) => (
                    <SelectItem key={p._id} value={p._id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Customer</Label>
              <Select
                value={form.customerId || 'none'}
                onValueChange={(v) => setForm({ ...form, customerId: v === 'none' ? '' : v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {(customers.data?.items ?? []).map((c) => (
                    <SelectItem key={c._id} value={c._id}>
                      {c.companyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Firmware</Label>
              <Input
                value={form.firmwareVersion}
                onChange={(e) => setForm({ ...form, firmwareVersion: e.target.value })}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Notes</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 border-t border-[var(--border)] pt-4">
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? 'Saving…' : 'Save device'}
            </Button>
            <Button variant="outline" asChild>
              <Link to={isEdit ? `/devices/${id}` : '/devices'}>Cancel</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
