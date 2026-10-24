# Social de los viernes — especificación de implementación

Algoritmo ya hecho: `lib/socialMatchmaking.ts` (`generateRound`). Diseño: `docs/plan/social-matchmaking.md`.
Auth: solo Google (Supabase). Admins = `profiles.role = 'admin'` (helper `validateAdminUser` en lib/authUtils.ts). Cliente admin server: `utils/supabase/admin.ts`.
Estética: tema oscuro + lima (tokens en styles/globals.css), Bricolage Grotesque. Panel admin: `app/admin/*` (sumar "Social" al menú lateral de app/admin/layout.tsx).

## Base de datos (migración nueva supabase/migrations/20261025100000_social.sql)
- `profiles`: agregar `gender text check (gender in ('M','F','X'))`, `social_level smallint check (1..10)`, `social_level_suggested smallint check (1..10)`.
  Función RPC `update_own_profile` ampliada (o nueva `update_own_social_profile(gender, suggested_level)`) — el usuario NO puede tocar `social_level` (lo fija el admin).
- `social_events`: id uuid pk, title text, starts_at timestamptz, courts smallint default 3 check 1..10, round_minutes smallint default 15, gender_policy text check in ('libre','preferir_mixto','separado') default 'preferir_mixto', status text check in ('draft','open','closed') default 'draft', checkin_token text unique not null default encode(gen_random_bytes(16),'hex'), created_at.
- `social_attendees`: event_id fk cascade, profile_id fk cascade, joined_at timestamptz default now(), joined_at_round int not null default 0, left_at timestamptz null, primary key (event_id, profile_id).
  Permite también invitados sin cuenta: en vez de PK compuesta usar id uuid pk + profile_id nullable + guest_name text + guest_gender + guest_level, unique(event_id, profile_id). (Los admins pueden agregar a mano gente que no tiene Google.)
- `social_rounds`: id uuid pk, event_id fk cascade, number int, started_at timestamptz null, ends_at timestamptz null, seed int, created_at; unique(event_id, number). status text check in ('preview','live','done') default 'preview'.
- `social_matches`: id uuid pk, round_id fk cascade, court smallint, team_a uuid[] (attendee ids, 2), team_b uuid[] (2), locked boolean default false.
- RLS ON en todas. Lectura: authenticated puede leer events con status in ('open','closed'), attendees/rounds/matches de esos eventos (solo datos no sensibles: nombre y nivel — exponé una VIEW `social_board` con nombres, sin email/teléfono). Escritura: solo vía rutas API server con admin client, salvo check-in/salida propia (RPC security definer `social_checkin(token)` y `social_leave(event_id)`).
- Agregar tablas a la publicación `supabase_realtime`.

## Rutas API (app/api/social/...) — todas validan admin salvo check-in
- POST/PATCH/DELETE events; POST attendees (agregar invitado o usuario), PATCH attendee (nivel, género, sacar/reingresar), PATCH profile social_level.
- POST `events/[id]/rounds/generate` → arma con `generateRound` usando presentes (left_at null), historial de rondas 'live'/'done', courts, policy, lockedMatches de la ronda preview actual; guarda como ronda 'preview' (reemplaza la preview anterior).
- PATCH `rounds/[id]` → cambios manuales: mover/intercambiar jugadores entre canchas o desde el banco, fijar/desfijar cancha (locked). Validar que no haya ids duplicados.
- POST `rounds/[id]/start` → status 'live', started_at now, ends_at now+round_minutes; la ronda live anterior pasa a 'done'.
- Generación con seed aleatorio; "Regenerar" = nueva seed respetando canchas fijadas.

## Pantallas
- `/admin/social`: lista de eventos + crear evento (título, fecha/hora, canchas, minutos, política de género). Botón abrir/cerrar evento.
- `/admin/social/[id]`: panel de la noche.
  - QR grande para imprimir/mostrar (URL `/social/checkin/[token]`), usar un generador de QR sin dependencias pesadas (paquete `qrcode` está OK si hace falta).
  - Pool en vivo (Realtime): nombre, género, nivel (editable inline 1–10), partidos jugados, botón sacar/reingresar, agregar invitado a mano.
  - "Armar ronda" → preview por cancha (parejas + suma de niveles) y banco, con warnings. Cambios manuales: tocar un jugador y luego otro para intercambiarlos (también banco↔cancha); candado por cancha; "Regenerar".
  - "Iniciar ronda" + cronómetro de la ronda live.
- `/social/checkin/[token]`: si no hay sesión → botón Google (components/GoogleSignIn con next). Si falta género o nivel sugerido → formulario corto. Luego RPC check-in y redirige a `/social/[eventId]`.
- `/social/[eventId]`: vista del jugador (Realtime): ronda actual, su cancha, compañero y rivales, tiempo restante, próxima ronda / si descansa, botón "Me voy".
- `/social/[eventId]/tv`: pantalla grande con todas las canchas, banco y cronómetro; sin login (usar la view sin datos sensibles; si RLS lo impide, ruta server que lea con admin client y devuelva solo nombres) con refresco por Realtime o polling 5s.

## Verificación
npm run lint, npx tsc --noEmit -p ., npx jest (sumar tests de las rutas puras/validaciones si son simples), npm run build. No modificar lib/socialMatchmaking.ts salvo bug (reportarlo).
