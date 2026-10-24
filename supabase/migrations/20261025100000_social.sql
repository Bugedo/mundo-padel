-- Social de los viernes. Esta migración se entrega para aplicar por Supabase CLI,
-- pero no se ejecuta desde la aplicación ni desde este cambio.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('M', 'F', 'X')),
  ADD COLUMN IF NOT EXISTS social_level SMALLINT CHECK (social_level BETWEEN 1 AND 10),
  ADD COLUMN IF NOT EXISTS social_level_suggested SMALLINT CHECK (social_level_suggested BETWEEN 1 AND 10);

CREATE OR REPLACE FUNCTION public.update_own_social_profile(p_gender TEXT, p_suggested_level SMALLINT)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_profile public.profiles;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF p_gender NOT IN ('M', 'F', 'X') OR p_suggested_level NOT BETWEEN 1 AND 10 THEN
    RAISE EXCEPTION 'Invalid gender or suggested level';
  END IF;

  UPDATE public.profiles
  SET gender = p_gender, social_level_suggested = p_suggested_level, updated_at = now()
  WHERE id = auth.uid()
  RETURNING * INTO updated_profile;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found'; END IF;
  RETURN updated_profile;
END;
$$;
REVOKE ALL ON FUNCTION public.update_own_social_profile(TEXT, SMALLINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_own_social_profile(TEXT, SMALLINT) TO authenticated;

CREATE TABLE IF NOT EXISTS public.social_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (length(trim(title)) > 0),
  starts_at TIMESTAMPTZ NOT NULL,
  courts SMALLINT NOT NULL DEFAULT 3 CHECK (courts BETWEEN 1 AND 10),
  round_minutes SMALLINT NOT NULL DEFAULT 15 CHECK (round_minutes BETWEEN 5 AND 120),
  gender_policy TEXT NOT NULL DEFAULT 'preferir_mixto' CHECK (gender_policy IN ('libre', 'preferir_mixto', 'separado')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'closed')),
  checkin_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.social_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.social_events(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  guest_name TEXT,
  guest_gender TEXT CHECK (guest_gender IN ('M', 'F', 'X')),
  guest_level SMALLINT CHECK (guest_level BETWEEN 1 AND 10),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  joined_at_round INTEGER NOT NULL DEFAULT 0 CHECK (joined_at_round >= 0),
  left_at TIMESTAMPTZ,
  CONSTRAINT social_attendee_person_check CHECK (
    (profile_id IS NOT NULL AND guest_name IS NULL AND guest_gender IS NULL AND guest_level IS NULL)
    OR (profile_id IS NULL AND guest_name IS NOT NULL AND guest_gender IS NOT NULL AND guest_level IS NOT NULL)
  ),
  -- PostgreSQL's ordinary UNIQUE allows any number of NULL profile_id rows (guests)
  -- while still preventing a logged-in player from joining the same event twice.
  CONSTRAINT social_attendees_event_profile_unique UNIQUE (event_id, profile_id)
);
CREATE INDEX IF NOT EXISTS idx_social_attendees_event_present ON public.social_attendees(event_id) WHERE left_at IS NULL;

CREATE TABLE IF NOT EXISTS public.social_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.social_events(id) ON DELETE CASCADE,
  number INTEGER NOT NULL CHECK (number > 0),
  started_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  seed INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'preview' CHECK (status IN ('preview', 'live', 'done')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, number)
);
CREATE UNIQUE INDEX IF NOT EXISTS social_one_preview_per_event ON public.social_rounds(event_id) WHERE status = 'preview';

CREATE TABLE IF NOT EXISTS public.social_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES public.social_rounds(id) ON DELETE CASCADE,
  court SMALLINT NOT NULL CHECK (court BETWEEN 1 AND 10),
  team_a UUID[] NOT NULL CHECK (cardinality(team_a) = 2),
  team_b UUID[] NOT NULL CHECK (cardinality(team_b) = 2),
  locked BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(round_id, court),
  CHECK (
    team_a[1] <> team_a[2] AND team_b[1] <> team_b[2]
    AND team_a[1] <> team_b[1] AND team_a[1] <> team_b[2]
    AND team_a[2] <> team_b[1] AND team_a[2] <> team_b[2]
  )
);

ALTER TABLE public.social_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read published social events" ON public.social_events
  FOR SELECT TO authenticated USING (status IN ('open', 'closed'));
CREATE POLICY "Authenticated users can read published social attendees" ON public.social_attendees
  FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.social_events e WHERE e.id = event_id AND e.status IN ('open', 'closed')));
CREATE POLICY "Authenticated users can read published social rounds" ON public.social_rounds
  FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.social_events e WHERE e.id = event_id AND e.status IN ('open', 'closed')));
CREATE POLICY "Authenticated users can read published social matches" ON public.social_matches
  FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.social_rounds r JOIN public.social_events e ON e.id = r.event_id WHERE r.id = round_id AND e.status IN ('open', 'closed')));

CREATE OR REPLACE FUNCTION public.social_checkin(p_token TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_event public.social_events; v_round INTEGER; v_profile public.profiles;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_profile FROM public.profiles WHERE id = auth.uid();
  IF NOT FOUND OR v_profile.gender IS NULL OR v_profile.social_level_suggested IS NULL THEN
    RAISE EXCEPTION 'Social profile is incomplete';
  END IF;
  SELECT * INTO v_event FROM public.social_events WHERE checkin_token = p_token AND status = 'open';
  IF NOT FOUND THEN RAISE EXCEPTION 'Event not available'; END IF;
  SELECT COALESCE(MAX(number), 0) INTO v_round FROM public.social_rounds WHERE event_id = v_event.id AND status IN ('live', 'done');
  INSERT INTO public.social_attendees(event_id, profile_id, joined_at_round, left_at)
  VALUES (v_event.id, auth.uid(), v_round, NULL)
  ON CONFLICT (event_id, profile_id) DO UPDATE SET left_at = NULL, joined_at = now(), joined_at_round = EXCLUDED.joined_at_round;
  RETURN v_event.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.social_leave(p_event_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  UPDATE public.social_attendees SET left_at = now() WHERE event_id = p_event_id AND profile_id = auth.uid() AND left_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Active attendance not found'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.social_checkin(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.social_leave(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.social_checkin(TEXT), public.social_leave(UUID) TO authenticated;

-- The view is security definer so it can resolve profile names while exposing no
-- contact data; consumers receive only the projection below.
CREATE OR REPLACE VIEW public.social_board WITH (security_invoker = false) AS
SELECT
  a.id AS attendee_id, a.event_id, a.joined_at_round, a.left_at,
  COALESCE(NULLIF(p.full_name, ''), a.guest_name, 'Jugador/a') AS name,
  COALESCE(p.gender, a.guest_gender) AS gender,
  COALESCE(p.social_level, p.social_level_suggested, a.guest_level) AS level
FROM public.social_attendees a
JOIN public.social_events e ON e.id = a.event_id AND e.status IN ('open', 'closed')
LEFT JOIN public.profiles p ON p.id = a.profile_id;
GRANT SELECT ON public.social_board TO authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.social_events, public.social_attendees, public.social_rounds, public.social_matches;

-- Players may read published events, but never the check-in token (only the QR on site carries it).
REVOKE SELECT ON public.social_events FROM anon, authenticated;
GRANT SELECT (id, title, starts_at, courts, round_minutes, gender_policy, status, created_at)
  ON public.social_events TO authenticated;
