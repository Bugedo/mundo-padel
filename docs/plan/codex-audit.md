## Informe arquitectónico

### 1. Mapa actual

- `/` muestra `Turnero`: hoy permite solicitar reserva como invitado (nombre/teléfono), crea una reserva pendiente y abre WhatsApp.
- `/login` es login por email/contraseña exclusivo de admin; `/reset-password` sigue activo. `/:user/reservas` es legado y redirige a `/`.
- `/admin` redirige a `/admin/bookings`; existen paneles de reservas, recurrentes y clientes. La protección visual es client-side en [app/admin/layout.tsx:14](/Users/nicolasbugedo/repos/mundo-padel/app/admin/layout.tsx:14); los APIs administrativos sí llaman `validateAdminUser`.
- Auth: `proxy.ts` refresca sesión para todas las rutas; `utils/supabase/server.ts` crea cliente con cookies y `auth.getUser()` valida sesión; [lib/authUtils.ts:3](/Users/nicolasbugedo/repos/mundo-padel/lib/authUtils.ts:3) consulta `profiles.role`. Hay cliente browser duplicado entre `utils/supabase/client.ts` y [lib/supabaseClient.ts:3](/Users/nicolasbugedo/repos/mundo-padel/lib/supabaseClient.ts:3).
- Reserva pública: `Turnero` carga ocupación desde `/api/public-bookings`, calcula disponibilidad en cliente y hace POST. El API busca solapes, asigna cancha 1–3 y escribe con service role.
- Admin: `/api/bookings`, `/api/recurring-bookings`, `/api/clients` y `/api/users` usan service role con chequeo admin. Hay mantenimiento de recurrentes, cron semanal y scripts manuales.
- Tests: Jest contiene un test ejemplo, uno de mocks no ejecuta los handlers, y [Home.test.tsx:7](/Users/nicolasbugedo/repos/mundo-padel/__tests__/Home.test.tsx:7) espera texto que ya no existe. `npm run lint` pasa; Jest no pudo iniciar aquí porque el sandbox read-only impide crear su caché temporal.

### 2. Deuda prioritaria

1. **Escalada crítica a admin.** El trigger toma `role` desde metadata controlable por usuario en [baseline_schema.sql:34](/Users/nicolasbugedo/repos/mundo-padel/supabase/migrations/20260723000000_baseline_schema.sql:34), y la policy permite que cada usuario actualice toda su fila, incluido `role`, en [líneas 189–194](/Users/nicolasbugedo/repos/mundo-padel/supabase/migrations/20260723000000_baseline_schema.sql:189). Eso convierte una cuenta autenticada en admin. Forzar siempre `user` en el trigger; quitar UPDATE directo o usar RPC que sólo permita nombre/teléfono.

2. **PII pública.** `/api/public-bookings` hace `select('*')` y devuelve la fila completa en [route.ts:39–44](/Users/nicolasbugedo/repos/mundo-padel/app/api/public-bookings/route.ts:39), incluyendo teléfonos, nombres, estados y potencialmente comentarios. Devolver sólo `court/date/start/end/duration` o una vista pública sin PII.

3. **Service role sin protección consistente.** `weekly-propagation` es público ([líneas 29 y 196](/Users/nicolasbugedo/repos/mundo-padel/app/api/bookings/weekly-propagation/route.ts:29)); `auto-process` expone GET sin auth ([línea 100](/Users/nicolasbugedo/repos/mundo-padel/app/api/bookings/auto-process/route.ts:100)) y POST acepta el fallback predecible `default-secret` ([línea 71](/Users/nicolasbugedo/repos/mundo-padel/app/api/bookings/auto-process/route.ts:71)). Centralizar cron auth obligatorio y eliminar GET mutantes.

4. **Carreras de doble reserva.** La verificación e insert son operaciones separadas ([bookingUtils.ts:32](/Users/nicolasbugedo/repos/mundo-padel/lib/bookingUtils.ts:32), [public route:159](/Users/nicolasbugedo/repos/mundo-padel/app/api/public-bookings/route.ts:159)); no existe constraint de exclusión en DB. Resolver con función transaccional y constraint `EXCLUDE` por cancha/rango temporal.

5. **Actualizaciones demasiado abiertas.** Un admin puede enviar columnas arbitrarias como `updates` a `.update(updates)` ([bookings route:289–369](/Users/nicolasbugedo/repos/mundo-padel/app/api/bookings/route.ts:289)). Aplicar whitelist, validación de fecha/hora coherente y schema Zod.

6. Consolidar service client en `utils/supabase/admin.ts`, sin `NEXT_PUBLIC_*` como dependencia servidor; reducir tres mecanismos de recurrentes (UI, cron y propagación) a uno. `seed-recurring` aún referencia campos históricos (`day_of_week`, `start_date`) en [líneas 59 y 103](/Users/nicolasbugedo/repos/mundo-padel/app/api/bookings/seed-recurring/route.ts:59).

### 3. Propuesta

**Google para reservar.** Mantendría password sólo si recepción lo necesita; para jugadores, reemplazar el flujo guest por “Continuar con Google”. Crear `app/auth/callback/route.ts` que intercambie `code` con `exchangeCodeForSession`, valide `next` interno y redirija a `/perfil` si falta teléfono. Configurar Google y callback en Supabase. Tocar `app/login/page.tsx`, `Turnero.tsx`, `UserContext.tsx`, trigger de perfiles y agregar `/perfil`. El POST de reserva debe tomar `user.id` desde cookies, no datos de identidad enviados por navegador. El teléfono se completa mediante RPC controlada o endpoint autenticado.

**Social.** SQL base:

```sql
social_events(id uuid pk, slug text unique, starts_at timestamptz, courts smallint,
 round_minutes smallint default 15, status text, display_public boolean);
social_registrations(event_id uuid, profile_id uuid, level smallint check(level between 1 and 10),
 gender text, checked_in_at timestamptz, checkin_token_hash text, primary key(event_id,profile_id));
social_rounds(id uuid pk, event_id uuid, number int, generated_at timestamptz);
social_matches(id uuid pk, round_id uuid, court smallint, starts_at timestamptz, status text);
social_match_players(match_id uuid, profile_id uuid, team smallint, position smallint,
 primary key(match_id,profile_id));
```

Agregar índices por evento/estado y por jugador; historial de compañeros/rivales se deriva de `social_match_players`. RLS: perfil propio lee/escribe sólo su inscripción y check-in; asistentes del evento leen roster/partidos; admin CRUD; escritura de rondas exclusivamente server. Activar Realtime para registros, rondas, partidos y jugadores. Para TV pública, publicar una proyección sin teléfonos/email; para datos nominales, exigir cuenta asistente/admin.

El QR debe contener un token opaco rotativo del evento: escanear abre `/social/[slug]/check-in`, exige Google y hace POST autenticado; no incluir sesión ni identidad en QR.

El algoritmo vive en `lib/social/matchmaking.ts`: función TS pura, determinista por seed y testeable. Genera cuartetos con greedy + mejora local, minimizando diferencia de nivel, desbalance de género configurable, cantidad de partidos y repetición de compañero/rival. Un handler admin carga datos, ejecuta la función y persiste una ronda mediante RPC transaccional.

Rutas: `/social/[slug]` (jugador), `/social/[slug]/tv`, `/social/[slug]/check-in`, `/admin/social`, `/admin/social/[id]`; APIs `social/events`, `check-in`, `rounds/generate`.

### 4. Orden verificable

1. Corregir escalada de roles, PII pública, cron/service-role y constraint de solapes; tests de autorización.
2. Unificar clientes Supabase, validar schemas y estabilizar tests existentes.
3. Implementar Google callback, perfil/teléfono y reserva autenticada.
4. Migración Social + RLS + registro/check-in QR.
5. Algoritmo puro con fixtures de 30–40 jugadores y tests de balance/no repetición.
6. Persistencia transaccional, Realtime, vistas jugador/TV y pruebas end-to-end.