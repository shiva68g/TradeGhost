import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getImageKit } from '@/lib/imagekit'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const altText = formData.get('alt_text') as string | null

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    if (!altText?.trim()) return NextResponse.json({ error: 'Alt text is required' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '-')}`

    const uploadResult = await getImageKit().upload({
      file: buffer,
      fileName,
      folder: '/tradeghost',
    })

    const serviceClient = createServiceClient()
    const { data, error } = await serviceClient
      .from('media')
      .insert([{
        url: uploadResult.url,
        imagekit_file_id: uploadResult.fileId,
        alt_text: altText.trim(),
      }])
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
