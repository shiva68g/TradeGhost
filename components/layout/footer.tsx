import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import type { FooterItem } from '@/lib/types'

/* ----------------------------------------
   🔁 RENDER FOOTER ITEM (RECURSIVE)
---------------------------------------- */
function renderFooterItem(
  item: FooterItem,
  allItems: FooterItem[]
): React.ReactNode {
  const type = item.type ?? 'link'
  const children = allItems
    .filter(i => i.parent_id === item.id)
    .sort((a, b) => a.order - b.order)

  if (type === 'separator') {
    return <li key={item.id} className="my-3 border-t border-muted/20" />
  }

  if (type === 'title') {
    return (
      <li key={item.id} className="pt-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40">
          {item.label}
        </span>
      </li>
    )
  }

  return (
    <li key={item.id}>
      <Link
        href={item.href || '#'}
        className="group flex items-center text-sm text-muted-foreground hover:text-white transition-colors duration-200"
      >
        <span className="relative">
          {item.label}
          <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-primary transition-all duration-200 group-hover:w-full" />
        </span>
      </Link>
      {children.length > 0 && (
        <ul className="mt-2 ml-3 space-y-2 border-l border-muted/10 pl-3">
          {children.map(child => renderFooterItem(child, allItems))}
        </ul>
      )}
    </li>
  )
}

/* ----------------------------------------
   🧩 FOOTER COMPONENT
---------------------------------------- */
// Changed to Named Export to resolve the "undefined" error
export async function Footer() {
  const supabase = await createClient()

  const [
    { data: columns },
    { data: items },
    { data: settings },
  ] = await Promise.all([
    supabase.from('footer_columns').select('*').order('order'),
    supabase.from('footer').select('*').order('order'),
    supabase.from('settings').select('key, value').in('key', ['logo_url', 'site_name', 'site_description']),
  ])

  const settingsMap = Object.fromEntries((settings ?? []).map(s => [s.key, s.value]))
  const siteName = settingsMap.site_name ?? 'TradeGhost'
  const allItems = (items ?? []) as FooterItem[]

  const columnsData = (columns ?? []).map(col => ({
    id: col.id,
    title: col.title,
    rootItems: allItems
      .filter(i => i.column_id === col.id && !i.parent_id)
      .sort((a, b) => a.order - b.order),
  }))

  return (
    <footer className="relative border-t border-slate-900 bg-[#020617] text-slate-400 overflow-hidden">
      {/* Subtle Top Glow Accent */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      
      <div className="container max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8">
          
          {/* 🔹 Brand Section */}
          <div className="lg:col-span-4 flex flex-col space-y-6">
            <Link href="/" className="flex items-center gap-2 group">
              {settingsMap.logo_url ? (
                <Image
                  src={settingsMap.logo_url}
                  alt={siteName}
                  width={140}
                  height={40}
                  className="h-9 w-auto brightness-90 group-hover:brightness-110 transition-all"
                />
              ) : (
                <span className="text-xl font-black tracking-tighter text-white uppercase">{siteName}</span>
              )}
            </Link>
            
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground/70">
              {settingsMap.site_description ?? 'Professional-grade market intelligence for the modern trader.'}
            </p>

            {/* Status Indicator */}
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-40"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] uppercase tracking-[0.15em] font-bold text-emerald-500/80">
                Systems Operational
              </span>
            </div>
          </div>

          {/* 🔹 Navigation Columns */}
          <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-8">
            {columnsData.map(col => (
              <div key={col.id} className="space-y-4">
                <h4 className="text-xs font-bold text-white uppercase tracking-widest">
                  {col.title}
                </h4>
                <ul className="space-y-3">
                  {col.rootItems.map(item => renderFooterItem(item, allItems))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* 🔍 Search Bar Section */}
        <div className="mt-16 pt-8 border-t border-slate-900/50 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-col">
            <span className="text-white text-sm font-medium tracking-tight">Quick Search</span>
            <span className="text-xs opacity-50 font-light">Find assets, news, or platform guides.</span>
          </div>
          
          <form action="/search" className="flex w-full md:w-auto shadow-2xl">
            <div className="relative flex-1">
              <svg 
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" 
                xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input 
                type="search" 
                name="q"
                placeholder="Search platform..." 
                className="bg-slate-950 border border-slate-800 rounded-l-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary w-full md:w-80 transition-all placeholder:text-slate-600" 
              />
            </div>
            <button 
              type="submit"
              className="bg-white text-black px-6 py-2.5 rounded-r-lg text-sm font-bold hover:bg-primary hover:text-white transition-all border border-white"
            >
              Search
            </button>
          </form>
        </div>
      </div>

      {/* 🔹 Final Copyright Bar */}
      <div className="bg-black/20 py-8 border-t border-slate-900/30">
        <div className="container max-w-7xl mx-auto px-6 flex justify-center">
          <p className="text-[10px] uppercase tracking-[0.3em] font-medium opacity-30">
            © {new Date().getFullYear()} {siteName}
          </p>
        </div>
      </div>
    </footer>
  )
}