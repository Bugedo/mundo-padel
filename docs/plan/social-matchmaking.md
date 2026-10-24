# Social — algoritmo de armado de partidos (diseño aprobado)

Función pura en `lib/socialMatchmaking.ts`, tests en `__tests__/socialMatchmaking.test.ts` (docblock `/** @jest-environment node */`).

```ts
export type Gender = 'M' | 'F' | 'X';
export type GenderPolicy = 'libre' | 'preferir_mixto' | 'separado';
export interface PoolPlayer { id: string; level: number; gender: Gender; joinedAtRound: number }
export interface Match { court: number; teamA: [string, string]; teamB: [string, string] }
export interface PastRound { index: number; matches: Match[]; bench: string[] }
export interface MatchmakingInput { players: PoolPlayer[]; history: PastRound[]; courts: number; policy: GenderPolicy; seed?: number; lockedMatches?: Match[] }
export interface MatchmakingResult { matches: Match[]; bench: string[]; score: number; warnings: string[] }
export function generateRound(input: MatchmakingInput): MatchmakingResult;
```

## Fase A — quién juega (reglas duras)
- courtsUsed = min(courts, floor(n/4)); slots = 4*courtsUsed. n<4 o courts<=0 → sin partidos, todos al banco + warning.
- Partidos efectivos = jugados + baseline; baseline de quien llegó tarde = mediana de partidos jugados (hasta su joinedAtRound) de los presentes en ese momento, fija.
- Prioridad: 1) se sentó la ronda anterior (mustPlay), 2) menos partidos efectivos, 3) más rondas seguidas en banco, 4) azar con seed (mulberry32).
- mustPlay > slots → priorizar más bancos seguidos + warning.
- `separado`: pools por género, canchas asignadas por prioridad en bloques de 4; sobrantes <4 por género que sumen 4 → cancha mixta con warning, si no al banco.
- lockedMatches se respetan tal cual (sus jugadores ocupan slots).

## Fase B — formar canchas y parejas (score, menor = mejor), por cancha con sA/sB sumas de nivel
| término | fórmula | peso |
|---|---|---|
| balance | (sA−sB)² | 10 |
| spread cancha | max(0, maxLvl−minLvl−3)² | 3 |
| gap pareja | max(0, |a1−a2|−4) | 2 |
| pareja repetida | veces juntos (×2 si fue la ronda anterior) | 25 |
| rival repetido | veces enfrentados, por cada uno de los 4 cruces | 8 |
| preferir_mixto: parejas no mixtas por encima del mínimo inevitable | | 15 |
| preferir_mixto: cancha MM vs FF | | 40 |
| separado: cancha mixta no autorizada en fase A | | 1000 |

Búsqueda: R=200 reinicios (el primero: reparto serpentina por nivel), luego hill-climbing de swaps entre canchas eligiendo el mejor de los 3 emparejamientos posibles por cancha; quedarse con el mejor total. Debe correr <50 ms con 40 jugadores/10 canchas.

## Tests mínimos
<4 jugadores; 4 jugadores/3 canchas → 1 partido; 13/3 → 1 banco; nadie repite banco si evitable (10 rondas, 14 jugadores); tras N rondas diferencia de partidos jugados ≤1; tardío arranca en la mediana; alguien que se va no aparece; [10,9,2,1] → 10+1 vs 9+2; 4×9 y 4×2 → canchas agrupadas por nivel; sin parejas repetidas en 4 rondas de 8 jugadores; preferir_mixto 6M6F → todas mixtas; 12M sin crash; separado 8M4F → canchas monogénero; separado 7M5F → mixta con warning o banco; determinismo por seed; lockedMatches; validez de ids (sin duplicados, jugando ∪ banco = pool); performance 40/10 <50ms; courts<=0.
