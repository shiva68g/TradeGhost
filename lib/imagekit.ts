import ImageKit from 'imagekit'

// Lazy singleton — instantiated on first use, not at module load time.
// Prevents "Missing publicKey" crash during Next.js static build.
let _instance: ImageKit | null = null

export function getImageKit(): ImageKit {
  if (!_instance) {
    const publicKey = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY
    const privateKey = process.env.IMAGEKIT_PRIVATE_KEY
    const urlEndpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT

    if (!publicKey || !privateKey || !urlEndpoint) {
      throw new Error(
        'ImageKit env vars missing: NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY, ' +
        'IMAGEKIT_PRIVATE_KEY, NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT'
      )
    }

    _instance = new ImageKit({ publicKey, privateKey, urlEndpoint })
  }
  return _instance
}

export function imagekitUrl(path: string, transforms = 'f-auto,q-80') {
  const base = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT ?? ''
  return `${base}${path}?tr=${transforms}`
}

export function imagekitLogoUrl(path: string) {
  return imagekitUrl(path, 'f-auto,q-80,h-48')
}
