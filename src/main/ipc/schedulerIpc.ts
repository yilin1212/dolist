import { ipcMain } from 'electron'
import { ScheduleRepo, SettingsRepo } from '../db/repositories'

interface TimeSlot {
  start: string
  end: string
}

const GRANULARITY = 15
const LOOKAHEAD_DAYS = 4
const MAX_OFFSETS = 8

function ceilToGranularity(dt: Date): Date {
  const d = new Date(dt)
  const discard = d.getMinutes() % GRANULARITY
  d.setMinutes(d.getMinutes() - discard, 0, 0)
  if (dt > d) d.setMinutes(d.getMinutes() + GRANULARITY)
  return d
}

function dayPeriodLabel(dt: Date): string {
  const h = dt.getHours()
  if (h < 12) return '上午'
  if (h < 14) return '中午'
  if (h < 18) return '下午'
  return '晚上'
}

function dailyFreeSlots(day: Date, startFrom?: Date): Array<{ start: Date; end: Date }> {
  const startH = SettingsRepo.getInt('workday_start_hour', 9)
  const endH = SettingsRepo.getInt('workday_end_hour', 22)

  const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), startH, 0)
  const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate(), endH, 0)

  if (startFrom && startFrom.toDateString() === day.toDateString()) {
    const floored = ceilToGranularity(startFrom)
    if (floored > dayStart) dayStart.setTime(floored.getTime())
  }
  if (dayStart >= dayEnd) return []

  const blocks = ScheduleRepo.listBetweenOverlap(dayStart.toISOString(), dayEnd.toISOString())
    .sort((a, b) => a.start_time.localeCompare(b.start_time))

  const free: Array<{ start: Date; end: Date }> = []
  let cursor = new Date(dayStart)

  for (const b of blocks) {
    const bs = new Date(b.start_time)
    const be = new Date(b.end_time)
    if (bs > cursor) free.push({ start: new Date(cursor), end: bs })
    if (be > cursor) cursor = be
  }
  if (cursor < dayEnd) free.push({ start: new Date(cursor), end: dayEnd })
  return free
}

function fitsInFree(start: Date, end: Date, freeList: Array<{ start: Date; end: Date }>): boolean {
  return freeList.some((f) => f.start <= start && end <= f.end)
}

function groupByDay(
  starts: Date[],
  perPiece: number,
  freeList: Array<{ start: Date; end: Date }>,
  numPieces: number
): TimeSlot[][] {
  const sorted = [...starts].sort((a, b) => a.getTime() - b.getTime())
  const groups: TimeSlot[][] = []

  function takeNonOverlapping(minIdx: number): TimeSlot[] {
    const picked: TimeSlot[] = []
    for (let i = minIdx; i < sorted.length; i++) {
      const s = sorted[i]
      const e = new Date(s.getTime() + perPiece * 60000)
      if (picked.some((p) => {
        const ps = new Date(p.start)
        const pe = new Date(p.end)
        return (ps <= s && s < pe) || (ps < e && e <= pe)
      })) continue
      if (picked.length > 0 && s < new Date(picked[picked.length - 1].end)) continue
      if (!fitsInFree(s, e, freeList)) continue
      picked.push({ start: s.toISOString(), end: e.toISOString() })
      if (picked.length >= numPieces) return picked
    }
    return picked.length >= numPieces ? picked : []
  }

  for (let offset = 0; offset < Math.min(sorted.length, MAX_OFFSETS); offset++) {
    const g = takeNonOverlapping(offset)
    if (g.length >= numPieces) groups.push(g)
  }
  return groups
}

function recommendSlots(
  durationMinutes: number,
  numPieces = 1,
  maxOptions = 5
): TimeSlot[][] {
  if (durationMinutes <= 0) return []
  numPieces = Math.max(1, numPieces)
  let perPiece = Math.ceil(durationMinutes / numPieces / GRANULARITY) * GRANULARITY

  const startFrom = new Date()
  const today = startFrom

  const allFree: Array<{ start: Date; end: Date }> = []
  for (let delta = 0; delta < LOOKAHEAD_DAYS; delta++) {
    const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() + delta)
    allFree.push(...dailyFreeSlots(day, startFrom))
  }

  const candidateStarts: Date[] = []
  for (const free of allFree) {
    const cur = new Date(free.start)
    while (cur.getTime() + perPiece * 60000 <= free.end.getTime()) {
      candidateStarts.push(new Date(cur))
      cur.setMinutes(cur.getMinutes() + GRANULARITY)
    }
  }
  candidateStarts.sort((a, b) => a.getTime() - b.getTime())

  if (numPieces === 1) {
    const options: TimeSlot[][] = []
    const seen = new Set<string>()
    for (const s of candidateStarts) {
      const e = new Date(s.getTime() + perPiece * 60000)
      const bucket = `${s.toDateString()}-${dayPeriodLabel(s)}`
      if (seen.has(bucket)) continue
      if (!fitsInFree(s, e, allFree)) continue
      options.push([{ start: s.toISOString(), end: e.toISOString() }])
      seen.add(bucket)
      if (options.length >= maxOptions) break
    }
    return options
  }

  const groups = groupByDay(candidateStarts, perPiece, allFree, numPieces)
  const options: TimeSlot[][] = []
  const seenSigs = new Set<string>()
  for (const g of groups) {
    const sig = g.map((s) => `${s.start}-${s.end}`).join('|')
    if (seenSigs.has(sig)) continue
    seenSigs.add(sig)
    options.push(g)
    if (options.length >= maxOptions) break
  }
  return options
}

export function registerSchedulerIpc(): void {
  ipcMain.handle('scheduler:recommendSlots', (_, durationMinutes: number, numPieces?: number, maxOptions?: number) => {
    try {
      return recommendSlots(durationMinutes, numPieces, maxOptions)
    } catch (e) {
      console.error('Failed to recommend slots:', e)
      return []
    }
  })
}
