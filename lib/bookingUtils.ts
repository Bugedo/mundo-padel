import { createClient } from '@supabase/supabase-js';

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/** Non-cancelled bookings hold the court (pending or confirmed). */
export function isBookingHoldingSlot(booking: {
  cancelled?: boolean;
}): boolean {
  return !booking.cancelled;
}

export function timesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string,
): boolean {
  const toMin = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  const aStart = toMin(startA);
  const aEnd = toMin(endA);
  const bStart = toMin(startB);
  const bEnd = toMin(endB);
  return aStart < bEnd && aEnd > bStart;
}

export async function findOverlappingBookings(date: string, start_time: string, end_time: string) {
  const { data: existingBookings, error } = await supabaseAdmin
    .from('bookings')
    .select('*')
    .eq('date', date)
    .neq('cancelled', true);

  if (error) {
    return { error, overlapping: [] as Record<string, unknown>[] };
  }

  const overlapping = (existingBookings || []).filter((booking) => {
    if (!isBookingHoldingSlot(booking)) return false;
    return timesOverlap(start_time, end_time, booking.start_time, booking.end_time);
  });

  return { error: null, overlapping };
}

export function assignCourt(
  overlapping: { court: number | null }[],
  preferredCourt?: number | null,
): { court: number | null; error?: string } {
  if (preferredCourt) {
    const occupied = overlapping.some((b) => b.court === preferredCourt);
    if (occupied) {
      return { court: null, error: `Court ${preferredCourt} is already occupied in this time slot` };
    }
    return { court: preferredCourt };
  }

  const occupiedCourts = new Set(
    overlapping.map((b) => b.court).filter((c): c is number => c !== null),
  );

  for (let i = 1; i <= 3; i++) {
    if (!occupiedCourts.has(i)) {
      return { court: i };
    }
  }

  return { court: null, error: 'No available courts' };
}

/** Normalize AR phone to E.164-ish digits with country code, no + */
export function normalizeArgentinePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;

  let normalized = digits;
  if (normalized.startsWith('54')) {
    // already has country code
  } else if (normalized.startsWith('0')) {
    normalized = `54${normalized.slice(1)}`;
  } else if (normalized.length <= 10) {
    normalized = `54${normalized}`;
  }

  // AR mobile: 54 + area + number, typically 12–13 digits
  if (normalized.length < 11 || normalized.length > 15) return null;
  return normalized;
}

export function formatPhoneDisplay(e164Digits: string): string {
  if (e164Digits.startsWith('54')) {
    return `+${e164Digits}`;
  }
  return `+${e164Digits}`;
}

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(key: string, limit = 8, windowMs = 60_000): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count += 1;
  return true;
}
