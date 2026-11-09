import type { MediaAsset } from '@/types/domain'
import { seedMediaAssets } from '@/data/seed'
import { readJson, writeJson } from './storage'

const MEDIA_KEY = 'dws.mock.media.v2'

const stored = readJson<MediaAsset[] | null>(MEDIA_KEY, null)
let assets: MediaAsset[] = stored ? structuredClone(stored) : structuredClone(seedMediaAssets)

function persist(): void {
  writeJson(MEDIA_KEY, assets)
}

const pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

export const mediaRepository = {
  async list(): Promise<MediaAsset[]> {
    await pause(60)
    return structuredClone(assets)
  },
  async listByTeam(teamId: string): Promise<MediaAsset[]> {
    await pause(60)
    return structuredClone(assets.filter((asset) => asset.teamId === teamId || !asset.teamId))
  },
  async listPublished(): Promise<MediaAsset[]> {
    await pause(60)
    return structuredClone(assets.filter((asset) => asset.status === 'published'))
  },
  async create(asset: MediaAsset): Promise<MediaAsset> {
    await pause(80)
    assets = [asset, ...assets]
    persist()
    return structuredClone(asset)
  },
  async update(id: string, patch: Partial<MediaAsset>): Promise<MediaAsset | null> {
    await pause(60)
    const index = assets.findIndex((asset) => asset.id === id)
    if (index === -1) return null
    assets[index] = {
      ...assets[index]!,
      ...patch,
      id,
      updatedAt: new Date().toISOString(),
    }
    persist()
    return structuredClone(assets[index])
  },
  async remove(id: string): Promise<void> {
    await pause(60)
    assets = assets.filter((asset) => asset.id !== id)
    persist()
  },
}
