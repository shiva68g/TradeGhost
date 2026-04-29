'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useTheme } from 'next-themes'
import { Moon, Sun, Menu, X, ChevronDown, ChevronRight } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation' // Added for URL detection
import { Button } from '@/components/ui/button'
import { useNavItems } from '@/hooks/use-navbar'
import { useSettings } from '@/hooks/use-settings'
import { cn } from '@/lib/utils'
import type { NavItem } from '@/lib/types'

/* =========================
   FLYOUT (Nested dropdown)
========================= */
function FlyoutItem({ item, allItems, depth, onClose }: {
  item: NavItem
  allItems: NavItem[]
  depth: number
  onClose: () => void
}) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  
  const children = allItems
    .filter(i => i.parent_id === item.id)
    .sort((a, b) => a.order - b.order)

  const isActive = pathname === item.href

  if (children.length === 0) {
    if (item.type === 'title') {
      return (
        <span className="block px-4 py-1.5 text-xs font-semibold uppercase text-muted-foreground/60">
          {item.label}
        </span>
      )
    }

    return (
      <Link
        href={item.href}
        className={cn(
          "block px-4 py-2 text-sm transition-colors hover:bg-muted",
          isActive ? "bg-muted text-primary font-medium" : "text-muted-foreground"
        )}
        onClick={onClose}
      >
        {item.label}
      </Link>
    )
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button 
        className={cn(
          "flex w-full items-center justify-between px-4 py-2 text-sm hover:bg-muted",
          isActive ? "text-primary font-medium" : "text-muted-foreground"
        )}
      >
        {item.label}
        <ChevronRight className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div className="absolute left-full top-0 ml-1 min-w-[180px] rounded-md border bg-background shadow-lg z-50">
          {children.map(child => (
            <FlyoutItem
              key={child.id}
              item={child}
              allItems={allItems}
              depth={depth + 1}
              onClose={onClose}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/* =========================
   MAIN DROPDOWN
========================= */
function NavDropdown({ item, allItems }: { item: NavItem; allItems: NavItem[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  const children = allItems
    .filter(i => i.parent_id === item.id)
    .sort((a, b) => a.order - b.order)

  // Check if any child of this dropdown is active
  const isChildActive = children.some(child => {
    if (pathname === child.href) return true
    // Also check 2nd level children
    return allItems.some(sub => sub.parent_id === child.id && pathname === sub.href)
  })

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className={cn(
          "flex items-center gap-1 text-sm transition-colors hover:text-foreground font-medium",
          isChildActive ? "text-foreground underline underline-offset-8 decoration-2 decoration-primary" : "text-muted-foreground"
        )}
      >
        {item.label}
        <ChevronDown className={cn('h-3.5 w-3.5 transition', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 min-w-[200px] rounded-md border bg-background shadow-lg z-50">
          {children.map(child => (
            <FlyoutItem
              key={child.id}
              item={child}
              allItems={allItems}
              depth={1}
              onClose={() => setOpen(false)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/* =========================
   NAVBAR
========================= */
export function Navbar() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  const { data: navItems = [] } = useNavItems()
  const { data: settings = {} } = useSettings()

  useEffect(() => setMounted(true), [])

  const topLevel = navItems
    .filter(i => !i.parent_id)
    .sort((a, b) => a.order - b.order)

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
      <div className="container flex h-16 items-center px-4">

        {/* LOGO */}
        <Link href="/" className="flex items-center gap-2 mr-6">
          {settings.logo_url ? (
            <Image src={settings.logo_url} alt="logo" width={120} height={48} className="object-contain" />
          ) : (
            <span className="text-xl font-bold">
              {settings.site_name ?? 'TradeGhost'}
            </span>
          )}
        </Link>

        {/* DESKTOP NAV */}
        <nav className="hidden md:flex flex-1 justify-center gap-6">
          {topLevel.map(item => {
            const hasChildren = navItems.some(i => i.parent_id === item.id)
            const isActive = pathname === item.href

            if (hasChildren) {
              return (
                <NavDropdown
                  key={item.id}
                  item={item}
                  allItems={navItems}
                />
              )
            }

            return (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-foreground",
                  isActive ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* RIGHT SIDE (Theme & Mobile) */}
        <div className="flex items-center gap-2 ml-auto">
          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            >
              {resolvedTheme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen(v => !v)}
          >
            {mounted ? (mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />) : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* MOBILE NAV (Optional implementation) */}
      {mobileOpen && (
        <div className="md:hidden border-t bg-background p-4 flex flex-col gap-4">
          {topLevel.map(item => (
            <Link 
              key={item.id} 
              href={item.href} 
              onClick={() => setMobileOpen(false)}
              className={cn(
                "text-sm font-medium",
                pathname === item.href ? "text-primary" : "text-muted-foreground"
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  )
}
