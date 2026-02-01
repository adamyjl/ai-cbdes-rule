import { create } from 'zustand'
import { archiveAppend, archiveList } from '../utils/api'
import type { ArchiveEvent } from '../utils/api'

const STORAGE_KEY = 'archive_cache:v1'
const MAX_EVENTS = 500

function loadCache(): { events: ArchiveEvent[]; lastSyncAt: number } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const v = JSON.parse(raw)
    if (!v || typeof v !== 'object') return null
    const events = Array.isArray((v as any).events) ? ((v as any).events as ArchiveEvent[]) : []
    const lastSyncAt = typeof (v as any).lastSyncAt === 'number' ? (v as any).lastSyncAt : 0
    return { events, lastSyncAt }
  } catch {
    return null
  }
}

function saveCache(events: ArchiveEvent[], lastSyncAt: number) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ events: events.slice(0, MAX_EVENTS), lastSyncAt }))
  } catch {
    return
  }
}

function mergeEvents(prev: ArchiveEvent[], next: ArchiveEvent[]) {
  const byId = new Map<string, ArchiveEvent>()
  for (const e of prev) byId.set(String(e.id), e)
  for (const e of next) byId.set(String(e.id), e)
  const merged = Array.from(byId.values())
  merged.sort((a, b) => {
    const at = a.ts ? Date.parse(String(a.ts)) : 0
    const bt = b.ts ? Date.parse(String(b.ts)) : 0
    if (bt !== at) return bt - at
    return String(b.id).localeCompare(String(a.id))
  })
  return merged.slice(0, MAX_EVENTS)
}

type ArchiveState = {
  hydrated: boolean
  loading: boolean
  error: string | null
  lastSyncAt: number
  events: ArchiveEvent[]

  bootstrap: () => void
  refresh: (limit?: number) => Promise<void>
  append: (type: string, payload: Record<string, unknown>) => Promise<ArchiveEvent>
  upsertLocal: (ev: ArchiveEvent) => void
}

export const useArchiveStore = create<ArchiveState>((set, get) => ({
  hydrated: false,
  loading: false,
  error: null,
  lastSyncAt: 0,
  events: [],

  bootstrap: () => {
    if (get().hydrated) return
    const cached = loadCache()
    if (cached) {
      set({ events: mergeEvents([], cached.events), lastSyncAt: cached.lastSyncAt })
    }
    set({ hydrated: true })
    void get().refresh(300)
  },

  refresh: async (limit = 300) => {
    if (get().loading) return
    set({ loading: true, error: null })
    try {
      const remote = await archiveList(limit)
      const merged = mergeEvents(get().events, remote)
      const lastSyncAt = Date.now()
      set({ events: merged, lastSyncAt })
      saveCache(merged, lastSyncAt)
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'archive_refresh_failed' })
    } finally {
      set({ loading: false })
    }
  },

  append: async (type: string, payload: Record<string, unknown>) => {
    const ev = await archiveAppend(type, payload)
    get().upsertLocal(ev)
    return ev
  },

  upsertLocal: (ev) => {
    const merged = mergeEvents(get().events, [ev])
    const lastSyncAt = get().lastSyncAt || Date.now()
    set({ events: merged })
    saveCache(merged, lastSyncAt)
  }
}))

