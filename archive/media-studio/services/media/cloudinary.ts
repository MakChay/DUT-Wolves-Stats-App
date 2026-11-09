import { canUploadToCloudinary, cloudinaryConfig } from '@/services/firebase/config'

export const MEDIA_UPLOAD_LIMIT_BYTES = 8 * 1024 * 1024
export const MEDIA_ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

export interface CloudinaryUploadResult {
  url: string
  publicId: string
  width: number
  height: number
  bytes: number
  format: string
}

export function validateMediaFile(file: File): string | null {
  if (!(MEDIA_ACCEPTED_TYPES as readonly string[]).includes(file.type)) {
    return 'Use a JPG, PNG or WebP image.'
  }
  if (file.size > MEDIA_UPLOAD_LIMIT_BYTES) {
    return 'Images must be 8 MB or smaller.'
  }
  return null
}

/**
 * Uploads through an unsigned Cloudinary preset, so no API secret reaches the
 * browser. Progress is reported from the XHR upload stream.
 */
export function uploadToCloudinary(
  file: File,
  options: { folder: string; onProgress?: (percent: number) => void },
): Promise<CloudinaryUploadResult> {
  if (!canUploadToCloudinary) {
    return Promise.reject(new Error('Cloudinary upload preset is not configured.'))
  }

  return new Promise((resolve, reject) => {
    const form = new FormData()
    form.append('file', file)
    form.append('upload_preset', cloudinaryConfig.uploadPreset)
    form.append('folder', options.folder)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`)

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        options.onProgress?.(Math.round((event.loaded / event.total) * 100))
      }
    }

    xhr.onload = () => {
      let body: Record<string, unknown> = {}
      try {
        body = JSON.parse(xhr.responseText) as Record<string, unknown>
      } catch {
        // Non-JSON responses are handled by the status check below.
      }
      if (xhr.status >= 200 && xhr.status < 300 && typeof body.secure_url === 'string') {
        resolve({
          url: body.secure_url,
          publicId: String(body.public_id ?? ''),
          width: Number(body.width ?? 0),
          height: Number(body.height ?? 0),
          bytes: Number(body.bytes ?? 0),
          format: String(body.format ?? ''),
        })
      } else {
        const message =
          typeof body.error === 'object' && body.error !== null && 'message' in body.error
            ? String((body.error as { message: unknown }).message)
            : `Upload failed (${xhr.status}).`
        reject(new Error(message))
      }
    }

    xhr.onerror = () => reject(new Error('Network error during upload.'))
    xhr.send(form)
  })
}
