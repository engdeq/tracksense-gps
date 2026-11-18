import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { customersApi, lookupApi } from '@/api/endpoints'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ErrorBlock, LoadingBlock, PageHeader } from '@/components/shared/page-states'

export function CustomerFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const qc = useQueryClient()

  const existing = useQuery({
    queryKey: ['customer', id],
    queryFn: () => customersApi.get(id!),
    enabled: isEdit,
  })
  const countries = useQuery({ queryKey: ['countries'], queryFn: lookupApi.countries })

  const [form, setForm] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    countryId: '',
    cityId: '',
    address: '',
    status: 'active' as 'active' | 'inactive' | 'suspended',
    notes: '',
  })

  useEffect(() => {
    if (existing.data) {
      const c = existing.data
      setForm({
        companyName: c.companyName,
        contactName: c.contactName,
        email: c.email,
        phone: c.phone ?? '',
        countryId: typeof c.countryId === 'object' ? c.countryId._id : String(c.countryId ?? ''),
        cityId: typeof c.cityId === 'object' ? c.cityId._id : String(c.cityId ?? ''),
        address: c.address ?? '',
        status: c.status,
        notes: c.notes ?? '',
      })
    }
  }, [existing.data])

  const cities = useQuery({
    queryKey: ['cities', form.countryId],
    queryFn: () => lookupApi.cities(form.countryId),
    enabled: Boolean(form.countryId),
  })

  const save = useMutation({
    mutationFn: async () => {
      if (isEdit) return customersApi.update(id!, form)
      return customersApi.create(form)
    },
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: ['customers'] })
      navigate(isEdit ? `/customers/${id}` : `/customers/${(res as { _id: string })._id}`)
    },
  })

  if (isEdit && existing.isLoading) return <LoadingBlock />

  return (
    <div className="space-y-6">
      <PageHeader
        title={isEdit ? 'Edit customer' : 'New customer'}
        description="Corporate fleet account details with country and city assignment."
        breadcrumbs={[
          { label: 'Customers', href: '/customers' },
          { label: isEdit ? 'Edit' : 'New' },
        ]}
      />
      {save.isError ? <ErrorBlock message="Save failed. Check required fields." /> : null}
      <Card>
        <CardHeader className="border-b border-[var(--border)] bg-gradient-to-r from-[var(--card)] to-[var(--primary-soft)]/50">
          <CardTitle>Customer details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-2">
              <Label>Company name *</Label>
              <Input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Contact / full name *</Label>
              <Input value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Country *</Label>
              <Select value={form.countryId} onValueChange={(v) => setForm({ ...form, countryId: v, cityId: '' })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {(countries.data ?? []).map((c) => (
                    <SelectItem key={c._id} value={c._id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>City</Label>
              <Select value={form.cityId} onValueChange={(v) => setForm({ ...form, cityId: v })} disabled={!form.countryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select city" />
                </SelectTrigger>
                <SelectContent>
                  {(cities.data ?? []).map((c) => (
                    <SelectItem key={c._id} value={c._id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2 xl:col-span-2">
              <Label>Address</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v as 'active' | 'inactive' | 'suspended' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 border-t border-[var(--border)] pt-4">
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? 'Saving…' : 'Save customer'}
            </Button>
            <Button variant="outline" asChild>
              <Link to={isEdit ? `/customers/${id}` : '/customers'}>Cancel</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}