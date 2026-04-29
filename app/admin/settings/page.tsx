'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { SettingsSchema, type SettingsInput } from '@/lib/validations'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import Image from 'next/image'

function useSettingsAdmin() {
  return useQuery<Record<string, string>>({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await fetch('/api/settings')
      if (!res.ok) throw new Error('Failed to load settings')
      const { data } = await res.json()
      return data ?? {}
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: false,
  })
}

export default function AdminSettingsPage() {
  const { data: settings, isLoading } = useSettingsAdmin()
  const queryClient = useQueryClient()

  const form = useForm<SettingsInput>({
    resolver: zodResolver(SettingsSchema),
    defaultValues: {
      site_name: '',
      site_description: '',
      logo_url: '',
      favicon_url: '',
      market_india_more_url: '',
      market_global_more_url: '',
      market_gainers_more_url: '',
      market_losers_more_url: '',
      market_forex_more_url: '',
      market_crypto_more_url: '',
    },
  })

  useEffect(() => {
    if (settings) {
      form.reset({
        site_name: settings.site_name ?? '',
        site_description: settings.site_description ?? '',
        logo_url: settings.logo_url ?? '',
        favicon_url: settings.favicon_url ?? '',
        market_india_more_url: settings.market_india_more_url ?? '',
        market_global_more_url: settings.market_global_more_url ?? '',
        market_gainers_more_url: settings.market_gainers_more_url ?? '',
        market_losers_more_url: settings.market_losers_more_url ?? '',
        market_forex_more_url: settings.market_forex_more_url ?? '',
        market_crypto_more_url: settings.market_crypto_more_url ?? '',
      })
    }
  }, [settings, form])

  const saveMutation = useMutation({
    mutationFn: async (values: SettingsInput) => {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (!res.ok) throw new Error('Failed to save settings')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      toast.success('Settings saved')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const marketSyncMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/markets/run', { method: 'POST' })
      const body = await res.json()
      if (!res.ok && res.status !== 207) throw new Error(body.error ?? 'Failed to run market sync')
      return body as { success: boolean; updated?: string[]; errors?: string[] }
    },
    onSuccess: (result) => {
      const updated = result.updated?.join(', ') || 'market data'
      if (result.errors?.length) {
        toast.warning(`Market sync partly completed: ${updated}`)
      } else {
        toast.success(`Market sync completed: ${updated}`)
      }
      queryClient.invalidateQueries({ queryKey: ['market_data'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const logoUrl = form.watch('logo_url')
  const faviconUrl = form.watch('favicon_url')

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Settings</h1>

      {isLoading ? (
        <div className="space-y-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : (
        <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))} className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Site Identity</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Site Name *</Label>
                <Input {...form.register('site_name')} placeholder="TradeGhost" />
                {form.formState.errors.site_name && <p className="text-xs text-destructive">{form.formState.errors.site_name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Site Description</Label>
                <Input {...form.register('site_description')} placeholder="Live market data & trading news" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Logo</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Logo URL (from ImageKit)</Label>
                <Input {...form.register('logo_url')} placeholder="https://ik.imagekit.io/..." />
                <p className="text-xs text-muted-foreground">Upload to Media first, then paste URL here. Falls back to site name text if empty.</p>
              </div>
              {logoUrl && (
                <div className="border rounded-md p-3">
                  <p className="text-xs text-muted-foreground mb-2">Preview:</p>
                  <Image src={logoUrl} alt="Logo preview" width={160} height={48} className="h-10 w-auto object-contain" />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Favicon</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Favicon URL</Label>
                <Input {...form.register('favicon_url')} placeholder="https://ik.imagekit.io/..." />
                <p className="text-xs text-muted-foreground">Accepts .ico, .png, .svg from ImageKit</p>
              </div>
              {faviconUrl && (
                <div className="border rounded-md p-3 flex items-center gap-2">
                  <Image src={faviconUrl} alt="Favicon preview" width={32} height={32} className="h-8 w-8 object-contain" />
                  <span className="text-sm text-muted-foreground">Favicon preview</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Market "Show More" Links</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Override the default "Show more" link for each market section in the sidebar. Leave empty to use the default route.
              </p>
              <div className="space-y-2">
                <Label>Indian Market — Show More URL</Label>
                <Input {...form.register('market_india_more_url')} placeholder="/markets/india" />
              </div>
              <div className="space-y-2">
                <Label>Global Market — Show More URL</Label>
                <Input {...form.register('market_global_more_url')} placeholder="/markets/global" />
              </div>
              <div className="space-y-2">
                <Label>Top Gainers — Show More URL</Label>
                <Input {...form.register('market_gainers_more_url')} placeholder="/markets/india#gainers" />
              </div>
              <div className="space-y-2">
                <Label>Top Losers — Show More URL</Label>
                <Input {...form.register('market_losers_more_url')} placeholder="/markets/india#losers" />
              </div>
              <div className="space-y-2">
                <Label>Forex — Show More URL</Label>
                <Input {...form.register('market_forex_more_url')} placeholder="/markets/forex" />
              </div>
              <div className="space-y-2">
                <Label>Crypto — Show More URL</Label>
                <Input {...form.register('market_crypto_more_url')} placeholder="/markets/crypto" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Market Data Runner</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Click this to fetch latest Indian market, global market, gainers, losers, forex, and crypto data and save it into Supabase now.
              </p>
              <Button type="button" onClick={() => marketSyncMutation.mutate()} disabled={marketSyncMutation.isPending}>
                {marketSyncMutation.isPending ? 'Running Market Data...' : 'Run Market Data Now'}
              </Button>
              <p className="text-xs text-muted-foreground">
                For automatic updates, keep the Supabase cron functions scheduled every 5 and 15 minutes. This button is a manual backup runner.
              </p>
            </CardContent>
          </Card>

          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Saving...' : 'Save Settings'}
          </Button>
        </form>
      )}
    </div>
  )
}
