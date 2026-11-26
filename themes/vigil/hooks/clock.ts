/** The clock tower's time: the hour, minute and second on a wall clock. */
export type WallTime = { h: number; m: number; s: number }

// A fixed offset from UTC: +05:30, -8, UTC+9, GMT-03:00.
const OFFSET = /^(?:utc|gmt)?\s*([+-])(\d{1,2})(?::?(\d{2}))?$/i

/**
 * The time on a wall in `zone` (an IANA name such as Asia/Tokyo, or a fixed
 * offset such as +05:30) at `now`; with no zone, this computer's own.
 */
export function wallTime(now: number, zone?: string): WallTime {
  const offset = zone ? OFFSET.exec(zone.trim()) : null
  if (offset) {
    const minutes = (offset[1] === '-' ? -1 : 1) * (Number(offset[2]) * 60 + Number(offset[3] ?? 0))
    const at = new Date(now + minutes * 60_000)

    return { h: at.getUTCHours(), m: at.getUTCMinutes(), s: at.getUTCSeconds() + at.getUTCMilliseconds() / 1000 }
  }
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: zone || undefined,
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hourCycle: 'h23',
    }).formatToParts(new Date(now))
    const part = (type: string) => Number(parts.find(p => p.type === type)?.value ?? 0)

    return { h: part('hour') % 24, m: part('minute'), s: part('second') + (now % 1000) / 1000 }
  } catch {
    const at = new Date(now)

    return { h: at.getHours(), m: at.getMinutes(), s: at.getSeconds() }
  }
}

/** Why `zone` isn't a time zone the clock can keep, or null when it is. */
export function zoneProblem(zone: string): string | null {
  const offset = OFFSET.exec(zone.trim())
  if (offset) {
    return Number(offset[2]) > 14 || Number(offset[3] ?? 0) > 59 ? `${zone} is not an offset from UTC` : null
  }
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone })

    return null
  } catch {
    return `${zone} is not a time zone Vigil knows: try a name like Europe/London or Asia/Tokyo, or an offset like +05:30`
  }
}

/** 14:05 as a clock face would read it, for messages: "2:05". */
export function readOut({ h, m }: WallTime): string {
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')}`
}
