import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminSidebar, SidebarToggle } from '@/components/admin/sidebar'

export const dynamic = 'force-dynamic'

async function checkAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: userRecord } = await supabase
    .from('users').select('role').eq('id', user.id).single()
  if (userRecord?.role !== 'admin') redirect('/login')
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await checkAdmin()

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center gap-3 px-4 py-3 border-b bg-background lg:hidden">
          <SidebarToggle />
          <span className="font-semibold">Admin Panel</span>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
