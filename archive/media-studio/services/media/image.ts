import type { MediaCrop } from '@/types/domain'

export interface ProcessedImage {
  file: File
  width: number
  height: number
  bytes: number
  mimeType: string
}

export interface ProcessImageOptions {
  aspect: number
  /** 1 = no additional zoom, higher values crop tighter. */
  zoom?: number
  /** Focal point, 0 (left/top) to 1 (right/bottom). */
  focusX?: number
  focusY?: number
  maxDimension?: number
  quality?: number
  mimeType?: 'image/jpeg' | 'image/webp'
}

export function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('That image could not be read. Try another JPG, PNG or WebP file.'))
    }
    image.src = url
  })
}

/** Computes the source rectangle used for the crop, in image pixels. */
export function cropRect(
  width: number,
  height: number,
  options: Pick<ProcessImageOptions, 'aspect' | 'zoom' | 'focusX' | 'focusY'>,
): { x: number; y: number; width: number; height: number } {
  const aspect = options.aspect > 0 ? options.aspect : 1
  const zoom = Math.max(1, options.zoom ?? 1)
  const focusX = Math.min(1, Math.max(0, options.focusX ?? 0.5))
  const focusY = Math.min(1, Math.max(0, options.focusY ?? 0.5))

  let cropWidth = width
  let cropHeight = width / aspect
  if (height / width < 1 / aspect) {
    cropHeight = height
    cropWidth = height * aspect
  }
  cropWidth = Math.max(1, Math.min(width, Math.round(cropWidth / zoom)))
  cropHeight = Math.max(1, Math.min(height, Math.round(cropHeight / zoom)))

  return {
    x: Math.round((width - cropWidth) * focusX),
    y: Math.round((height - cropHeight) * focusY),
    width: cropWidth,
    height: cropHeight,
  }
}

/**
 * Crops and compresses in the browser before upload, so Cloudinary receives a
 * smaller, correctly framed file and no server round-trip is needed.
 */
export async function processImage(
  file: File,
  options: ProcessImageOptions,
): Promise<ProcessedImage> {
  const image = await loadImage(file)
  const rect = cropRect(image.naturalWidth, image.naturalHeight, options)
  const maxDimension = options.maxDimension ?? 1600
  const scale = Math.min(1, maxDimension / Math.max(rect.width, rect.height))
  const outWidth = Math.max(1, Math.round(rect.width * scale))
  const outHeight = Math.max(1, Math.round(rect.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = outWidth
  canvas.height = outHeight
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Image processing is not supported in this browser.')
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(
    image,
    rect.x,
    rect.y,
    rect.width,
    rect.height,
    0,
    0,
    outWidth,
    outHeight,
  )

  const mimeType = options.mimeType ?? 'image/jpeg'
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, mimeType, options.quality ?? 0.82),
  )
  if (!blob) throw new Error('The image could not be compressed.')

  const extension = mimeType === 'image/webp' ? 'webp' : 'jpg'
  const baseName = file.name.replace(/\.[^.]+$/, '') || 'media'
  return {
    file: new File([blob], `${baseName}.${extension}`, {
      type: mimeType,
      lastModified: Date.now(),
    }),
    width: outWidth,
    height: outHeight,
    bytes: blob.size,
    mimeType,
  }
}

export function mediaCropFor(
  imageWidth: number,
  imageHeight: number,
  options: ProcessImageOptions,
): MediaCrop {
  const rect = cropRect(imageWidth, imageHeight, options)
  return {
    x: Math.round((rect.x / imageWidth) * 1000) / 1000,
    y: Math.round((rect.y / imageHeight) * 1000) / 1000,
    width: Math.round((rect.width / imageWidth) * 1000) / 1000,
    height: Math.round((rect.height / imageHeight) * 1000) / 1000,
    aspect: options.aspect,
  }
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB'
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export const CROP_PRESETS = [
  { value: '1', label: 'Square 1:1' },
  { value: '1.5', label: 'Portrait 2:3' },
  { value: '1.3333', label: 'Landscape 4:3' },
  { value: '1.7778', label: 'Wide 16:9' },
  { value: '2.5', label: 'Banner 5:2' },
] as const
