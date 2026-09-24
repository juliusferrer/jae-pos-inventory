// lib/cloudinary.ts
const CLOUD_NAME    = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!

export interface CloudinaryResult {
  secure_url: string
  public_id:  string
}

export async function uploadToCloudinary(
  file: File,
  folder = 'sizzle-pos'
): Promise<CloudinaryResult> {
  const form = new FormData()
  form.append('file', file)
  form.append('upload_preset', UPLOAD_PRESET)
  form.append('folder', folder)

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`,
    { method: 'POST', body: form }
  )
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error?.message ?? 'Cloudinary upload failed')
  }
  return res.json()
}

export function cdnUrl(url: string, w = 400, h = 300, q = 80): string {
  if (!url?.includes('res.cloudinary.com')) return url
  return url.replace('/upload/', `/upload/c_fill,w_${w},h_${h},q_${q},f_auto/`)
}
