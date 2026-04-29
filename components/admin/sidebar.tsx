'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/lib/store'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  LayoutDashboard, FileText, File, Navigation, AlignCenter, Image,
  Settings, Search, BarChart2, ScrollText, LogOut, Menu, X, Ghost
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const navItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/posts', label: 'Posts', icon: FileText },
  { href: '/admin/pages', label: 'Pages', icon: File },
  { href: '/admin/navbar', label: 'Navbar', icon: Navigation },
  { href: '/admin/footer', label: 'Footer', icon: AlignCenter },
  { href: '/admin/media', label: 'Media', icon: Image },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
  { href: '/admin/seo', label: 'SEO', icon: Search },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart2 },
  { href: '/admin/logs', label: 'Logs', icon: ScrollText },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const { sidebarOpen, toggleSidebar } = useAppStore()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    toast.success('Logged out')
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 flex flex-col bg-card border-r transition-transform duration-300',
        'w-64',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        'lg:translate-x-0 lg:static lg:z-auto'
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Ghost className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">TradeGhost</span>
          </div>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={toggleSidebar}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
                onClick={() => { if (window.innerWidth < 1024) toggleSidebar() }}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>
    </>
  )
}

export function SidebarToggle() {
  const { toggleSidebar } = useAppStore()
  return (
    <Button variant="ghost" size="icon" onClick={toggleSidebar} className="lg:hidden">
      <Menu className="h-5 w-5" />
    </Button>
  )
}
