import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getImageKit } from '@/lib/imagekit'

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const serviceClient = createServiceClient()

    const { data: media } = await serviceClient
      .from('media')
      .select('url, imagekit_file_id')
      .eq('id', params.id)
      .single()

    if (media) {
      try {
        const fileId =
          media.imagekit_file_id ??
          media.url.split('/').pop()?.split('?')[0]

        if (fileId) await getImageKit().deleteFile(fileId)
      } catch {
        console.warn('ImageKit delete failed for media id:', params.id)
      }
    }

    const { error } = await serviceClient.from('media').delete().eq('id', params.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }
}
