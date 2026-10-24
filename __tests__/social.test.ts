import { attendeeGender, attendeeLevel, attendeeName, formatSocialDateTime, isGender, isGenderPolicy, parseSocialDateTime, positiveInteger, socialDateTimeWithOffset, socialStatusLabel, validateDistinctMatches } from '@/lib/social';

describe('social validation helpers', () => {
  it('accepts only defined gender policies and bounded integer levels', () => {
    expect(isGender('F')).toBe(true);
    expect(isGender('f')).toBe(false);
    expect(isGenderPolicy('preferir_mixto')).toBe(true);
    expect(isGenderPolicy('anything')).toBe(false);
    expect(positiveInteger('10', 1, 10)).toBe(10);
    expect(positiveInteger(10.5, 1, 10)).toBeNull();
    expect(positiveInteger(11, 1, 10)).toBeNull();
  });

  it('does not allow a manual board to duplicate a player or court', () => {
    expect(validateDistinctMatches([{ court: 1, teamA: ['a', 'b'], teamB: ['c', 'd'] }])).toBeNull();
    expect(validateDistinctMatches([{ court: 1, teamA: ['a', 'b'], teamB: ['c', 'a'] }])).toMatch(/cuatro jugadores/i);
    expect(validateDistinctMatches([
      { court: 1, teamA: ['a', 'b'], teamB: ['c', 'd'] },
      { court: 1, teamA: ['e', 'f'], teamB: ['g', 'h'] },
    ])).toMatch(/cancha/i);
  });

  it('uses profile values first and safely falls back to guest data', () => {
    const attendee = { id: 'a', event_id: 'e', profile_id: null, guest_name: ' Invitada ', guest_gender: 'F' as const, guest_level: 6, joined_at: '', joined_at_round: 0, left_at: null };
    expect(attendeeName(attendee)).toBe('Invitada');
    expect(attendeeGender(attendee)).toBe('F');
    expect(attendeeLevel(attendee)).toBe(6);
  });

  it('treats datetime-local values as Cordoba time and displays them without seconds', () => {
    expect(socialDateTimeWithOffset('2026-10-31T20:00')).toBe('2026-10-31T20:00:00-03:00');
    expect(parseSocialDateTime('2026-10-31T20:00')?.toISOString()).toBe('2026-10-31T23:00:00.000Z');
    expect(formatSocialDateTime('2026-10-31T23:00:00.000Z')).toBe('sáb 31/10, 20:00');
  });

  it('uses Spanish labels for event statuses', () => {
    expect(socialStatusLabel('draft')).toBe('Borrador');
    expect(socialStatusLabel('open')).toBe('Abierto');
    expect(socialStatusLabel('closed')).toBe('Cerrado');
  });
});
