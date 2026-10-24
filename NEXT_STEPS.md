# NEXT_STEPS — Mundo Padel (actualizado 2026-10-24)

## Estado
- Supabase nuevo (free) en cuenta contactomundopadel@gmail.com: proyecto `kbinnuiqstdgecqoiwok`. Schema base aplicado (4 migraciones de 2026-07-23). `.env.local` apunta ahí (URL, publishable, secret). `/api/health` OK.
- Dashboard de esa cuenta: Chrome "Browser 1" (perfil onlymarimbas). La CLI de Supabase está logueada con OTRA cuenta → aplicar SQL vía SQL Editor en ese Chrome.
- Plan de arquitectura: `docs/plan/codex-audit.md`. Diseño del algoritmo Social: `docs/plan/social-matchmaking.md`.
- Hecho (sin commit): `lib/socialMatchmaking.ts` + `__tests__/socialMatchmaking.test.ts` (19/19 OK).
- Hecho (sin commit): hardening de seguridad (migración `20261024100000_security_hardening.sql` YA APLICADA en el proyecto nuevo; cronAuth, public-bookings sin PII, admin client unificado, whitelist PATCH, 409 por solape). Corregí el rango para turnos que terminan a medianoche y saqué la policy INSERT de profiles.
- Falta: `CRON_SECRET` en `.env.local` y en Vercel. `context/UserContext.tsx` todavía intenta insertar el perfil (ahora falla en silencio; el trigger lo crea) → limpiar al hacer Google login.
- Rebuild visual de la home HECHO (sin commit) según `docs/mockups/rebuild-home.html` (aprobado): tokens nuevos, fuentes Bagel Fat One + Bricolage, Header/Footer, turnero restyleado con el hover de horarios intacto, secciones Social/TV/Info estáticas. Verificado desktop + mobile 375px sin overflow; build OK.

## Pendiente
1. HECHO: login solo con Google (GCP proyecto `smooth-reason-512621-v9` en cuenta nebugedo, app publicada; Supabase provider Google ON, email OFF; Site URL www.mundopadelclub.com). Admins (tabla `admin_emails`) ven link 'Panel' en el header. Páginas /privacidad y /terminos.
2. Pendiente: `/perfil` (teléfono, género) y reserva autenticada (user.id desde cookies).
3. Social: migración (social_events, social_registrations con level/gender, social_rounds, social_matches, social_match_players) + RLS + Realtime; rutas `/social/[slug]`, `/social/[slug]/check-in` (QR con token), `/social/[slug]/tv`, `/admin/social`, `/admin/social/[id]`; API generate-round usa `generateRound`.
4. Retoques del turnero que pida Nico.
5. Preguntas a dueños (hoy son settings por evento): canchas para Social (default 3), política de género, quién fija nivel (admin final).
