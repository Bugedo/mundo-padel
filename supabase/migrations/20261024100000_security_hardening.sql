-- Security hardening: prevent privilege escalation, restrict profile changes,
-- and make overlapping court reservations impossible at the database layer.

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NULL),
    COALESCE(NEW.raw_user_meta_data->>'phone', NULL),
    'user'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
-- Profiles are created only by the auth trigger, never directly by clients.
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE OR REPLACE FUNCTION public.update_own_profile(full_name TEXT, phone TEXT)
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

  UPDATE public.profiles
  SET
    full_name = $1,
    phone = $2,
    updated_at = now()
  WHERE id = auth.uid()
  RETURNING * INTO updated_profile;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  RETURN updated_profile;
END;
$$;

REVOKE ALL ON FUNCTION public.update_own_profile(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_own_profile(TEXT, TEXT) TO authenticated;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS booking_time_range tsrange
  GENERATED ALWAYS AS (
    tsrange(
      date + start_time,
      -- Bookings that end at or past midnight (e.g. 22:30-00:00) roll over to the next day.
      date + end_time + CASE WHEN end_time <= start_time THEN interval '1 day' ELSE interval '0' END,
      '[)'
    )
  ) STORED;

ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_no_overlapping_court;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_no_overlapping_court
  EXCLUDE USING gist (court WITH =, booking_time_range WITH &&)
  WHERE (cancelled = false);
