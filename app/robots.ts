import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tradeghost.netlify.app'

type RobotsRule = {
  userAgent: string
  allow?: string | string[]
  disallow?: string | string[]
}

export default async function robots(): Promise<MetadataRoute.Robots> {
  const supabase = createClient()
  const { data: setting } = await supabase.from('settings').select('value').eq('key', 'robots_txt').single()

  if (setting?.value) {
    const lines = setting.value.split('\n').filter(Boolean)
    const rules: RobotsRule[] = []
    let current: RobotsRule | null = null

    for (const line of lines) {
      if (line.startsWith('User-agent:')) {
        if (current) rules.push(current)
        current = { userAgent: line.replace('User-agent:', '').trim(), allow: [], disallow: [] }
      } else if (current && line.startsWith('Allow:')) {
        const val = line.replace('Allow:', '').trim()
        if (Array.isArray(current.allow)) current.allow.push(val)
        else current.allow = [val]
      } else if (current && line.startsWith('Disallow:')) {
        const val = line.replace('Disallow:', '').trim()
        if (Array.isArray(current.disallow)) current.disallow.push(val)
        else current.disallow = [val]
      }
    }
    if (current) rules.push(current)

    return { rules, sitemap: `${BASE_URL}/sitemap.xml` }
  }

  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin/', '/api/'] },
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
