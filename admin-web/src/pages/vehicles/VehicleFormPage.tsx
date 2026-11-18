import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { customersApi, lookupApi, vehiclesApi, devicesApi } from '@/api/endpoints'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LoadingBlock, PageHeader } from '@/components/shared/page-states'

export function VehicleFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const qc = useQueryClient()

  const existing = useQuery({
    queryKey: ['vehicle', id],
    queryFn: () => vehiclesApi.get(id!),
    enabled: isEdit,
  })

  const customers = useQuery({ queryKey: ['customers-all'], queryFn: () => customersApi.list({ limit: 200, page: 1 }) })
  const types = useQuery({ queryKey: ['vehicle-types'], queryFn: lookupApi.vehicleTypes })
  const icons = useQuery({ queryKey: ['vehicle-icons'], queryFn: lookupApi.vehicleIcons })
  const devices = useQuery({ queryKey: ['devices-all'], queryFn: () => devicesApi.list({ limit: 200, page: 1 }) })

  const [form, setForm] = useState({
    name: '',
    plateNumber: '',
    brand: '',
    model: '',
    customerId: '',
    vehicleTypeId: '',
    iconId: '',
    deviceId: '',
    status: 'active',
    speedLimitKmh: 120,
    notes: '',
  })

  useEffect(() => {
    if (existing.data?.vehicle) {
      const v = existing.data.vehicle
      setForm({
        name: v.name,
        plateNumber: v.plateNumber,
        brand: v.brand ?? '',
        model: v.model ?? '',
        customerId: typeof v.customerId === 'object' && v.customerId ? v.customerId._id : String(v.customerId ?? ''),
        vehicleTypeId:
          typeof v.vehicleTypeId === 'object' && v.vehicleTypeId ? v.vehicleTypeId._id : String(v.vehicleTypeId ?? ''),
        iconId: typeof v.iconId === 'object' && v.iconId ? v.iconId._id : v.iconId ? String(v.iconId) : '',
        deviceId:
          typeof v.deviceId === 'object' && v.deviceId ? v.deviceId._id : v.deviceId ? String(v.deviceId) : '',
        status: v.status,
        speedLimitKmh: v.speedLimitKmh ?? 120,
        notes: v.notes ?? '',
      })
    }
  }, [existing.data])

  const save = useMutation({
    mutationFn: async () => {
      const body = {
        ...form,
        deviceId: form.deviceId || null,
        iconId: form.iconId || null,
      }
      if (isEdit) return vehiclesApi.update(id!, body)
      return vehiclesApi.create(body)
    },
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: ['vehicles'] })
      const vid = (res as { _id: string })._id
      navigate(isEdit ? `/vehicles/${id}` : `/vehicles/${vid}`)
    },
  })

  if (isEdit && existing.isLoading) return <LoadingBlock />

  return (
    <div className="space-y-6">
      <PageHeader
        title={isEdit ? 'Edit vehicle' : 'New vehicle'}
        description="Register fleet units and assign GPS devices from the database."
        breadcrumbs={[
          { label: 'Vehicles', href: '/vehicles' },
          { label: isEdit ? 'Edit' : 'New' },
        ]}
      />
      <Card>
        <CardHeader className="border-b border-[var(--border)] bg-gradient-to-r from-[var(--card)] to-[var(--primary-soft)]/50">
          <CardTitle>Vehicle details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-2">
              <Label>Vehicle name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Plate number *</Label>
              <Input value={form.plateNumber} onChange={(e) => setForm({ ...form, plateNumber: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Customer *</Label>
              <Select value={form.customerId} onValueChange={(v) => setForm({ ...form, customerId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Customer" />
                </SelectTrigger>
                <SelectContent>
                  {(customers.data?.items ?? []).map((c) => (
                    <SelectItem key={c._id} value={c._id}>
                      {c.companyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Vehicle type</Label>
              <Select value={form.vehicleTypeId} onValueChange={(v) => setForm({ ...form, vehicleTypeId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  {(types.data as { _id: string; name: string }[] | undefined)?.map((t) => (
                    <SelectItem key={t._id} value={t._id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Map icon</Label>
              <Select
                value={form.iconId || 'none'}
                onValueChange={(v) => setForm({ ...form, iconId: v === 'none' ? '' : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Default</SelectItem>
                  {(icons.data as { _id: string; name: string }[] | undefined)?.map((icon) => (
                    <SelectItem key={icon._id} value={icon._id}>
                      {icon.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>GPS device</Label>
              <Select
                value={form.deviceId || 'none'}
                onValueChange={(v) => setForm({ ...form, deviceId: v === 'none' ? '' : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {(devices.data?.items ?? []).map((d) => (
                    <SelectItem key={d._id} value={d._id}>
                      {d.imei} — {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Brand</Label>
              <Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Model</Label>
              <Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
            </div>
            <div className="space-y-2 md:col-span-2 xl:col-span-3">
              <Label>Notes</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 border-t border-[var(--border)] pt-4">
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? 'Saving…' : 'Save vehicle'}
            </Button>
            <Button variant="outline" asChild>
              <Link to={isEdit ? `/vehicles/${id}` : '/vehicles'}>Cancel</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
