import type { Gender, GenderPolicy, Match, PastRound, PoolPlayer } from '@/lib/socialMatchmaking';

export const GENDERS: Gender[] = ['M', 'F', 'X'];
export const GENDER_POLICIES: GenderPolicy[] = ['libre', 'preferir_mixto', 'separado'];
export const EVENT_STATUSES = ['draft', 'open', 'closed'] as const;
export const SOCIAL_TIME_ZONE = 'America/Argentina/Cordoba';
const SOCIAL_UTC_OFFSET = '-03:00';

export type EventStatus = (typeof EVENT_STATUSES)[number];
export type SocialAttendee = {
  id: string;
  event_id: string;
  profile_id: string | null;
  guest_name: string | null;
  guest_gender: Gender | null;
  guest_level: number | null;
  joined_at: string;
  joined_at_round: number;
  left_at: string | null;
  profile?: { full_name: string | null; gender: Gender | null; social_level: number | null; social_level_suggested?: number | null } | null;
};

export function isGender(value: unknown): value is Gender {
  return typeof value === 'string' && GENDERS.includes(value as Gender);
}

export function isGenderPolicy(value: unknown): value is GenderPolicy {
  return typeof value === 'string' && GENDER_POLICIES.includes(value as GenderPolicy);
}

export function isEventStatus(value: unknown): value is EventStatus {
  return typeof value === 'string' && EVENT_STATUSES.includes(value as EventStatus);
}

export function socialStatusLabel(status: string): string {
  const labels: Record<EventStatus, string> = { draft: 'Borrador', open: 'Abierto', closed: 'Cerrado' };
  return isEventStatus(status) ? labels[status] : status;
}

/**
 * `datetime-local` has no timezone. Social events always use Cordoba's UTC-3
 * wall clock, so attach that offset before sending the value to the database.
 */
export function socialDateTimeWithOffset(value: string): string | null {
  const match = value.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})(?::\d{2}(?:\.\d{1,3})?)?$/);
  if (!match) return null;
  const [datePart, timePart] = match[1].split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);
  const local = new Date(Date.UTC(year, month - 1, day, hour, minute));
  if (local.getUTCFullYear() !== year || local.getUTCMonth() !== month - 1 || local.getUTCDate() !== day || local.getUTCHours() !== hour || local.getUTCMinutes() !== minute) return null;
  const withOffset = `${match[1]}:00${SOCIAL_UTC_OFFSET}`;
  return Number.isNaN(new Date(withOffset).valueOf()) ? null : withOffset;
}

/** Parse either an ISO instant or a timezone-less Social datetime-local value. */
export function parseSocialDateTime(value: unknown): Date | null {
  if (typeof value !== 'string' || !value) return null;
  const normalized = socialDateTimeWithOffset(value) ?? value;
  const date = new Date(normalized);
  return Number.isNaN(date.valueOf()) ? null : date;
}

/** Format Social instants consistently, without seconds, in the club timezone. */
export function formatSocialDateTime(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.valueOf())) return '';
  const parts = new Intl.DateTimeFormat('es-AR', {
    timeZone: SOCIAL_TIME_ZONE,
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? '';
  return `${part('weekday').replace('.', '')} ${part('day')}/${part('month')}, ${part('hour')}:${part('minute')}`;
}

export function socialLevel(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 10 ? parsed : null;
}

export function positiveInteger(value: unknown, min: number, max: number): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

export function attendeeName(attendee: SocialAttendee): string {
  return attendee.profile?.full_name?.trim() || attendee.guest_name?.trim() || 'Jugador/a sin nombre';
}

export function attendeeGender(attendee: SocialAttendee): Gender | null {
  return attendee.profile?.gender || attendee.guest_gender || null;
}

export function attendeeLevel(attendee: SocialAttendee): number | null {
  return attendee.profile?.social_level || attendee.profile?.social_level_suggested || attendee.guest_level || null;
}

export function toPoolPlayer(attendee: SocialAttendee): PoolPlayer | null {
  const gender = attendeeGender(attendee);
  const level = attendeeLevel(attendee);
  if (!gender || !level) return null;
  return { id: attendee.id, gender, level, joinedAtRound: attendee.joined_at_round };
}

export function socialRoundToHistory(rounds: Array<{
  number: number;
  social_matches: Array<{ court: number; team_a: string[]; team_b: string[] }> | null;
}>): PastRound[] {
  return rounds.map((round) => ({
    index: round.number,
    matches: (round.social_matches || []).map((match) => ({
      court: match.court,
      teamA: [match.team_a[0], match.team_a[1]],
      teamB: [match.team_b[0], match.team_b[1]],
    })) as Match[],
    bench: [],
  }));
}

export function validateDistinctMatches(matches: Array<{ court: number; teamA: string[]; teamB: string[] }>): string | null {
  const ids = new Set<string>();
  const courts = new Set<number>();
  for (const match of matches) {
    const playerIds = [...match.teamA, ...match.teamB];
    if (!Number.isInteger(match.court) || match.court < 1 || playerIds.length !== 4 || new Set(playerIds).size !== 4) {
      return 'Cada cancha debe tener cuatro jugadores distintos.';
    }
    if (courts.has(match.court) || playerIds.some((id) => !id || ids.has(id))) {
      return 'Un jugador y una cancha solo pueden aparecer una vez.';
    }
    courts.add(match.court);
    playerIds.forEach((id) => ids.add(id));
  }
  return null;
}
