/** @jest-environment node */

import { effectiveMatches, generateRound, MatchmakingInput, PastRound, PoolPlayer } from '@/lib/socialMatchmaking';

const players = (count: number, options: Partial<PoolPlayer> = {}): PoolPlayer[] =>
  Array.from({ length: count }, (_, index) => ({ id: `p${index + 1}`, level: 5, gender: 'M', joinedAtRound: 0, ...options }));
const input = (pool: PoolPlayer[], extra: Partial<MatchmakingInput> = {}): MatchmakingInput => ({ players: pool, history: [], courts: 3, policy: 'libre', seed: 7, ...extra });
const ids = (round: ReturnType<typeof generateRound>) => round.matches.flatMap((match) => [...match.teamA, ...match.teamB]);

describe('social matchmaking', () => {
  it('leaves fewer than four players on the bench', () => expect(generateRound(input(players(3))).matches).toEqual([]));
  it('uses only one court for 4 players and 3 courts', () => expect(generateRound(input(players(4))).matches).toHaveLength(1));
  it('benches one of 13 players on 3 courts', () => expect(generateRound(input(players(13))).bench).toHaveLength(1));
  it('does not repeat a bench when avoidable', () => {
    const pool = players(14); let history: PastRound[] = [];
    for (let index = 0; index < 10; index += 1) { const round = generateRound(input(pool, { history, seed: 10 + index })); expect(round.bench).not.toEqual(history.at(-1)?.bench ?? []); history = [...history, { index, matches: round.matches, bench: round.bench }]; }
  });
  it('keeps played-match counts within one over repeated rounds', () => {
    const pool = players(14); let history: PastRound[] = [];
    for (let index = 0; index < 10; index += 1) { const round = generateRound(input(pool, { history })); history = [...history, { index, matches: round.matches, bench: round.bench }]; }
    const counts = pool.map((player) => history.filter((round) => round.matches.some((match) => [...match.teamA, ...match.teamB].includes(player.id))).length);
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
  });
  it('gives a late arrival the existing median baseline', () => {
    const pool = [...players(4), { id: 'late', level: 5, gender: 'M' as const, joinedAtRound: 2 }];
    const history: PastRound[] = [{ index: 0, matches: [{ court: 1, teamA: ['p1', 'p2'], teamB: ['p3', 'p4'] }], bench: [] }, { index: 1, matches: [{ court: 1, teamA: ['p1', 'p2'], teamB: ['p3', 'p4'] }], bench: [] }];
    expect(effectiveMatches(pool[4], pool, history)).toBe(2);
  });
  it('never resurrects a player who left the pool', () => {
    const result = generateRound(input(players(4), { history: [{ index: 0, matches: [{ court: 1, teamA: ['gone', 'p1'], teamB: ['p2', 'p3'] }], bench: [] }] }));
    expect(ids(result)).not.toContain('gone');
  });
  it('balances 10,9,2,1 as 10+1 vs 9+2', () => {
    const pool = [10, 9, 2, 1].map((level, index) => ({ id: `p${index}`, level, gender: 'M' as const, joinedAtRound: 0 }));
    const match = generateRound(input(pool, { courts: 1 })).matches[0];
    expect([match.teamA.map((id) => pool.find((p) => p.id === id)!.level).sort((a,b)=>a-b), match.teamB.map((id) => pool.find((p) => p.id === id)!.level).sort((a,b)=>a-b)]).toContainEqual([1, 10]);
  });
  it('groups four 9s and four 2s by court', () => {
    const pool = [...players(4, { level: 9 }), ...players(4, { level: 2 }).map((p, i) => ({ ...p, id: `low${i}` }))];
    const levelCounts = generateRound(input(pool, { courts: 2 })).matches.map((match) => {
      const levels = [...match.teamA, ...match.teamB].map((id) => pool.find((player) => player.id === id)!.level);
      return new Set(levels).size;
    });
    expect(levelCounts).toEqual([1, 1]);
  });
  it('avoids repeated pairs over four rounds of eight players', () => {
    const pool = players(8); let history: PastRound[] = []; const pairs = new Set<string>();
    for (let index = 0; index < 4; index += 1) { const result = generateRound(input(pool, { courts: 2, history, seed: index })); result.matches.forEach((m) => [m.teamA, m.teamB].forEach((team) => { const key = [...team].sort().join(':'); expect(pairs.has(key)).toBe(false); pairs.add(key); })); history = [...history, { index, matches: result.matches, bench: [] }]; }
  });
  it('makes every team mixed when 6M and 6F prefer it', () => {
    const pool = [...players(6, { gender: 'M' }), ...players(6, { gender: 'F' }).map((p, i) => ({ ...p, id: `f${i}` }))];
    expect(generateRound(input(pool, { policy: 'preferir_mixto' })).matches.every((m) => [m.teamA, m.teamB].every((team) => pool.find((p) => p.id === team[0])!.gender !== pool.find((p) => p.id === team[1])!.gender))).toBe(true);
  });
  it('handles 12 men', () => expect(generateRound(input(players(12))).matches).toHaveLength(3));
  it('keeps separate 8M/4F courts monogender', () => {
    const pool = [...players(8, { gender: 'M' }), ...players(4, { gender: 'F' }).map((p, i) => ({ ...p, id: `f${i}` }))];
    expect(generateRound(input(pool, { policy: 'separado' })).matches.every((m) => new Set([...m.teamA, ...m.teamB].map((id) => pool.find((p) => p.id === id)!.gender)).size === 1)).toBe(true);
  });
  it('warns when 7M/5F needs a separate-policy mixed court', () => {
    const pool = [...players(7, { gender: 'M' }), ...players(5, { gender: 'F' }).map((p, i) => ({ ...p, id: `f${i}` }))];
    expect(generateRound(input(pool, { policy: 'separado' })).warnings.join(' ')).toMatch(/mixed/i);
  });
  it('is deterministic for a seed', () => expect(generateRound(input(players(12), { seed: 9 })).matches).toEqual(generateRound(input(players(12), { seed: 9 })).matches));
  it('preserves locked matches', () => {
    const lock = { court: 2, teamA: ['p1', 'p2'] as [string, string], teamB: ['p3', 'p4'] as [string, string] };
    expect(generateRound(input(players(8), { courts: 2, lockedMatches: [lock] })).matches).toContainEqual(lock);
  });
  it('returns every pool id exactly once between playing and bench', () => {
    const pool = players(13); const result = generateRound(input(pool)); expect(new Set([...ids(result), ...result.bench])).toEqual(new Set(pool.map((p) => p.id))); expect(ids(result)).toHaveLength(new Set(ids(result)).size);
  });
  it('runs 40 players on 10 courts in under 50ms', () => { const start = performance.now(); generateRound(input(players(40), { courts: 10 })); expect(performance.now() - start).toBeLessThan(50); });
  it('benches everyone when courts are unavailable', () => expect(generateRound(input(players(4), { courts: 0 })).bench).toHaveLength(4));
});
