export type Gender = 'M' | 'F' | 'X';
export type GenderPolicy = 'libre' | 'preferir_mixto' | 'separado';

export interface PoolPlayer {
  id: string;
  level: number;
  gender: Gender;
  joinedAtRound: number;
}

export interface Match {
  court: number;
  teamA: [string, string];
  teamB: [string, string];
}

export interface PastRound {
  index: number;
  matches: Match[];
  bench: string[];
}

export interface MatchmakingInput {
  players: PoolPlayer[];
  history: PastRound[];
  courts: number;
  policy: GenderPolicy;
  seed?: number;
  lockedMatches?: Match[];
}

export interface MatchmakingResult {
  matches: Match[];
  bench: string[];
  score: number;
  warnings: string[];
}

type Random = () => number;
type RankedPlayer = PoolPlayer & { priority: number[]; random: number };
type CourtGroup = { players: PoolPlayer[]; mixedAllowed: boolean };

/** A small deterministic PRNG, so a seed completely reproduces a round. */
export function mulberry32(seed: number): Random {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function sortedHistory(history: PastRound[]): PastRound[] {
  return [...history].sort((a, b) => a.index - b.index);
}

export function playedMatches(history: PastRound[], id: string, throughRound = Infinity): number {
  let total = 0;
  for (const round of history) {
    if (round.index > throughRound) continue;
    for (const match of round.matches) {
      if ([...match.teamA, ...match.teamB].includes(id)) total += 1;
    }
  }
  return total;
}

/** Median of a numeric collection (the midpoint for an even-sized collection). */
export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 === 1 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
}

/** Fixed virtual matches used to put a late arrival on the current group's median. */
export function lateArrivalBaseline(player: PoolPlayer, players: PoolPlayer[], history: PastRound[]): number {
  if (player.joinedAtRound <= 0) return 0;
  const presentThen = players.filter((other) => other.joinedAtRound <= player.joinedAtRound);
  return median(presentThen.map((other) => playedMatches(history, other.id, player.joinedAtRound)));
}

export function effectiveMatches(player: PoolPlayer, players: PoolPlayer[], history: PastRound[]): number {
  return playedMatches(history, player.id) + lateArrivalBaseline(player, players, history);
}

export function consecutiveBenches(id: string, history: PastRound[]): number {
  let count = 0;
  const rounds = sortedHistory(history);
  for (let index = rounds.length - 1; index >= 0; index -= 1) {
    if (!rounds[index].bench.includes(id)) break;
    count += 1;
  }
  return count;
}

function lastRound(history: PastRound[]): PastRound | undefined {
  return sortedHistory(history).at(-1);
}

function priorityPlayers(players: PoolPlayer[], history: PastRound[], random: Random): RankedPlayer[] {
  const previousBench = new Set(lastRound(history)?.bench ?? []);
  return players
    .map((player) => ({
      ...player,
      priority: [
        previousBench.has(player.id) ? 0 : 1,
        effectiveMatches(player, players, history),
        -consecutiveBenches(player.id, history),
      ],
      random: random(),
    }))
    .sort((a, b) => {
      for (let index = 0; index < a.priority.length; index += 1) {
        if (a.priority[index] !== b.priority[index]) return a.priority[index] - b.priority[index];
      }
      if (a.random !== b.random) return a.random - b.random;
      return a.id.localeCompare(b.id);
    });
}

function validLocks(locks: Match[] | undefined, players: PoolPlayer[], courtsUsed: number): Match[] {
  const validIds = new Set(players.map((player) => player.id));
  const usedIds = new Set<string>();
  const usedCourts = new Set<number>();
  const valid: Match[] = [];
  for (const match of locks ?? []) {
    const ids = [...match.teamA, ...match.teamB];
    const unique = new Set(ids);
    if (
      valid.length >= courtsUsed ||
      !Number.isInteger(match.court) ||
      match.court <= 0 ||
      usedCourts.has(match.court) ||
      unique.size !== 4 ||
      ids.some((id) => !validIds.has(id) || usedIds.has(id))
    ) continue;
    ids.forEach((id) => usedIds.add(id));
    usedCourts.add(match.court);
    valid.push({ court: match.court, teamA: [...match.teamA], teamB: [...match.teamB] });
  }
  return valid;
}

function selectSeparate(
  ranked: RankedPlayer[],
  courtCount: number,
  lockedIds: Set<string>,
): { groups: CourtGroup[]; selected: PoolPlayer[]; mixed: boolean } {
  const candidates = ranked.filter((player) => !lockedIds.has(player.id));
  const genders: Gender[] = ['M', 'F', 'X'];
  const chunks = genders.flatMap((gender) => {
    const group = candidates.filter((player) => player.gender === gender);
    const result: RankedPlayer[][] = [];
    for (let index = 0; index + 3 < group.length; index += 4) result.push(group.slice(index, index + 4));
    return result;
  });
  chunks.sort((a, b) => a[0].priority[0] - b[0].priority[0] || a[0].priority[1] - b[0].priority[1] || a[0].random - b[0].random);
  const chosen = chunks.slice(0, courtCount);
  const used = new Set(chosen.flatMap((chunk) => chunk.map((player) => player.id)));
  const groups: CourtGroup[] = chosen.map((chunk) => ({ players: chunk, mixedAllowed: false }));

  if (groups.length < courtCount) {
    const leftovers = candidates.filter((player) => !used.has(player.id));
    const byGender = genders.map((gender) => leftovers.filter((player) => player.gender === gender));
    if (byGender.reduce((total, group) => total + group.length, 0) >= 4 && byGender.filter((group) => group.length > 0).length >= 2) {
      const mixedPlayers = leftovers.slice(0, 4);
      groups.push({ players: mixedPlayers, mixedAllowed: true });
      mixedPlayers.forEach((player) => used.add(player.id));
    }
  }
  return { groups, selected: groups.flatMap((group) => group.players), mixed: groups.some((group) => group.mixedAllowed) };
}

function snakeGroups(players: PoolPlayer[], courts: number): CourtGroup[] {
  const groups = Array.from({ length: courts }, () => [] as PoolPlayer[]);
  const ordered = [...players].sort((a, b) => b.level - a.level || a.id.localeCompare(b.id));
  for (let index = 0; index < ordered.length; index += 1) {
    const cycle = Math.floor(index / courts);
    const offset = index % courts;
    const court = cycle % 2 === 0 ? offset : courts - 1 - offset;
    groups[court].push(ordered[index]);
  }
  return groups.map((group) => ({ players: group, mixedAllowed: true }));
}

function shuffledGroups(players: PoolPlayer[], courts: number, random: Random): CourtGroup[] {
  const shuffled = [...players];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swap]] = [shuffled[swap], shuffled[index]];
  }
  return Array.from({ length: courts }, (_, index) => ({ players: shuffled.slice(index * 4, index * 4 + 4), mixedAllowed: true }));
}

function pairKey(first: string, second: string): string {
  return first < second ? `${first}\u0000${second}` : `${second}\u0000${first}`;
}

function relationCounts(history: PastRound[]): { pairs: Map<string, number>; lastPairs: Set<string>; rivals: Map<string, number> } {
  const pairs = new Map<string, number>();
  const rivals = new Map<string, number>();
  const add = (map: Map<string, number>, key: string) => map.set(key, (map.get(key) ?? 0) + 1);
  for (const round of history) {
    for (const match of round.matches) {
      add(pairs, pairKey(match.teamA[0], match.teamA[1]));
      add(pairs, pairKey(match.teamB[0], match.teamB[1]));
      for (const a of match.teamA) for (const b of match.teamB) add(rivals, pairKey(a, b));
    }
  }
  const lastPairs = new Set<string>();
  for (const match of lastRound(history)?.matches ?? []) {
    lastPairs.add(pairKey(match.teamA[0], match.teamA[1]));
    lastPairs.add(pairKey(match.teamB[0], match.teamB[1]));
  }
  return { pairs, lastPairs, rivals };
}

function arrangements(players: PoolPlayer[]): [[PoolPlayer, PoolPlayer], [PoolPlayer, PoolPlayer]][] {
  return [
    [[players[0], players[1]], [players[2], players[3]]],
    [[players[0], players[2]], [players[1], players[3]]],
    [[players[0], players[3]], [players[1], players[2]]],
  ];
}

function courtScore(
  players: PoolPlayer[],
  pairing: [[PoolPlayer, PoolPlayer], [PoolPlayer, PoolPlayer]],
  policy: GenderPolicy,
  mixedAllowed: boolean,
  counts: ReturnType<typeof relationCounts>,
): number {
  const [teamA, teamB] = pairing;
  const sumA = teamA[0].level + teamA[1].level;
  const sumB = teamB[0].level + teamB[1].level;
  let score = 10 * (sumA - sumB) ** 2;
  const levels = players.map((player) => player.level);
  score += 3 * Math.max(0, Math.max(...levels) - Math.min(...levels) - 3) ** 2;
  score += 2 * Math.max(0, Math.abs(teamA[0].level - teamA[1].level) - 4);
  score += 2 * Math.max(0, Math.abs(teamB[0].level - teamB[1].level) - 4);
  for (const team of [teamA, teamB]) {
    const key = pairKey(team[0].id, team[1].id);
    score += 25 * (counts.pairs.get(key) ?? 0) * (counts.lastPairs.has(key) ? 2 : 1);
  }
  for (const first of teamA) for (const second of teamB) score += 8 * (counts.rivals.get(pairKey(first.id, second.id)) ?? 0);
  if (policy === 'preferir_mixto') {
    const nonMixed = Number(teamA[0].gender === teamA[1].gender) + Number(teamB[0].gender === teamB[1].gender);
    score += 15 * nonMixed;
    if (teamA[0].gender === teamA[1].gender && teamB[0].gender === teamB[1].gender && teamA[0].gender !== teamB[0].gender) score += 40;
  }
  if (policy === 'separado' && !mixedAllowed && new Set(players.map((player) => player.gender)).size > 1) score += 1000;
  return score;
}

function bestPairing(group: CourtGroup, policy: GenderPolicy, counts: ReturnType<typeof relationCounts>): { pairing: [[PoolPlayer, PoolPlayer], [PoolPlayer, PoolPlayer]]; score: number } {
  return arrangements(group.players)
    .map((pairing) => ({ pairing, score: courtScore(group.players, pairing, policy, group.mixedAllowed, counts) }))
    .reduce((best, candidate) => candidate.score < best.score ? candidate : best);
}

function stateScore(groups: CourtGroup[], policy: GenderPolicy, counts: ReturnType<typeof relationCounts>): number {
  return groups.reduce((total, group) => total + bestPairing(group, policy, counts).score, 0);
}

function improveGroups(groups: CourtGroup[], policy: GenderPolicy, counts: ReturnType<typeof relationCounts>): CourtGroup[] {
  const improved = groups.map((group) => ({ ...group, players: [...group.players] }));
  let current = stateScore(improved, policy, counts);
  // A few full best-improvement passes retain the intended hill-climb while keeping 40/10 fast.
  for (let pass = 0; pass < 3; pass += 1) {
    let bestScore = current;
    let bestSwap: [number, number, number, number] | undefined;
    for (let firstCourt = 0; firstCourt < improved.length; firstCourt += 1) {
      for (let secondCourt = firstCourt + 1; secondCourt < improved.length; secondCourt += 1) {
        const first = improved[firstCourt];
        const second = improved[secondCourt];
        const before = bestPairing(first, policy, counts).score + bestPairing(second, policy, counts).score;
        for (let a = 0; a < 4; a += 1) for (let b = 0; b < 4; b += 1) {
          [first.players[a], second.players[b]] = [second.players[b], first.players[a]];
          const after = bestPairing(first, policy, counts).score + bestPairing(second, policy, counts).score;
          const candidate = current - before + after;
          [first.players[a], second.players[b]] = [second.players[b], first.players[a]];
          if (candidate < bestScore) {
            bestScore = candidate;
            bestSwap = [firstCourt, secondCourt, a, b];
          }
        }
      }
    }
    if (!bestSwap) break;
    const [firstCourt, secondCourt, a, b] = bestSwap;
    [improved[firstCourt].players[a], improved[secondCourt].players[b]] = [improved[secondCourt].players[b], improved[firstCourt].players[a]];
    current = bestScore;
  }
  return improved;
}

/** Build one round without mutating the input or retaining any state. */
export function generateRound(input: MatchmakingInput): MatchmakingResult {
  const players = [...input.players];
  const warnings: string[] = [];
  if (players.length < 4 || input.courts <= 0) {
    warnings.push(players.length < 4 ? 'Not enough players to form a match.' : 'No courts available.');
    return { matches: [], bench: players.map((player) => player.id), score: 0, warnings };
  }
  const courtsUsed = Math.min(Math.floor(input.courts), Math.floor(players.length / 4));
  if (courtsUsed <= 0) return { matches: [], bench: players.map((player) => player.id), score: 0, warnings: ['No courts available.'] };

  const locks = validLocks(input.lockedMatches, players, courtsUsed);
  const lockedIds = new Set(locks.flatMap((match) => [...match.teamA, ...match.teamB]));
  const random = mulberry32(input.seed ?? 0);
  const ranked = priorityPlayers(players, input.history, random);
  const remainingCourts = courtsUsed - locks.length;
  let groups: CourtGroup[];
  let selected: PoolPlayer[];
  let mixedSeparate = false;
  if (input.policy === 'separado') {
    const selection = selectSeparate(ranked, remainingCourts, lockedIds);
    groups = selection.groups;
    selected = selection.selected;
    mixedSeparate = selection.mixed;
  } else {
    selected = ranked.filter((player) => !lockedIds.has(player.id)).slice(0, remainingCourts * 4);
    groups = snakeGroups(selected, remainingCourts);
  }
  const mustPlay = ranked.filter((player) => !lockedIds.has(player.id) && (lastRound(input.history)?.bench ?? []).includes(player.id));
  if (mustPlay.length > remainingCourts * 4) warnings.push('More must-play players than available slots.');
  if (mixedSeparate) warnings.push('Separate policy required a mixed-gender court.');

  const counts = relationCounts(input.history);
  let bestGroups = groups;
  let bestScore = stateScore(groups, input.policy, counts);
  if (groups.length > 0 && input.policy !== 'separado') {
    for (let restart = 0; restart < 200; restart += 1) {
      // Every term is non-negative; a zero score is already globally optimal.
      if (bestScore === 0) break;
      const start = restart === 0 ? groups : shuffledGroups(selected, groups.length, random);
      const candidate = improveGroups(start, input.policy, counts);
      const candidateScore = stateScore(candidate, input.policy, counts);
      if (candidateScore < bestScore) {
        bestScore = candidateScore;
        bestGroups = candidate;
      }
    }
  }

  const usedCourts = new Set(locks.map((match) => match.court));
  const availableCourts: number[] = [];
  for (let court = 1; availableCourts.length < bestGroups.length; court += 1) if (!usedCourts.has(court)) availableCourts.push(court);
  const generated = bestGroups.map((group, index) => {
    const pairing = bestPairing(group, input.policy, counts).pairing;
    return { court: availableCourts[index], teamA: [pairing[0][0].id, pairing[0][1].id] as [string, string], teamB: [pairing[1][0].id, pairing[1][1].id] as [string, string] };
  });
  const matches = [...locks, ...generated].sort((a, b) => a.court - b.court);
  const playing = new Set(matches.flatMap((match) => [...match.teamA, ...match.teamB]));
  const score = matches.reduce((total, match) => {
    const group: CourtGroup = { players: [...match.teamA, ...match.teamB].map((id) => players.find((player) => player.id === id)!).filter(Boolean), mixedAllowed: true };
    const pairing: [[PoolPlayer, PoolPlayer], [PoolPlayer, PoolPlayer]] = [[group.players[0], group.players[1]], [group.players[2], group.players[3]]];
    return total + courtScore(group.players, pairing, input.policy, group.mixedAllowed, counts);
  }, 0);
  return { matches, bench: players.filter((player) => !playing.has(player.id)).map((player) => player.id), score, warnings };
}
