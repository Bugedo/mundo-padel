-- Baseline schema for Mundo Padel (fresh Supabase project)
-- Reconstructed from application code + prior incremental migrations.

-- ---------------------------------------------------------------------------
-- profiles (extends auth.users)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Auto-create profile when a user signs up
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
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- recurring_bookings
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.recurring_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  court INTEGER NOT NULL CHECK (court BETWEEN 1 AND 3),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes IN (60, 90, 120)),
  first_date DATE NOT NULL,
  last_date DATE,
  recurrence_interval_days INTEGER NOT NULL DEFAULT 7 CHECK (recurrence_interval_days > 0),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recurring_bookings_user_id ON public.recurring_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_bookings_first_date ON public.recurring_bookings(first_date);
CREATE INDEX IF NOT EXISTS idx_recurring_bookings_last_date ON public.recurring_bookings(last_date);
CREATE INDEX IF NOT EXISTS idx_recurring_bookings_active_first_date
  ON public.recurring_bookings(active, first_date) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_recurring_bookings_court_active
  ON public.recurring_bookings(court) WHERE active = true;

-- ---------------------------------------------------------------------------
-- bookings
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  court INTEGER CHECK (court BETWEEN 1 AND 3),
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes IN (60, 90, 120)),
  confirmed BOOLEAN NOT NULL DEFAULT false,
  present BOOLEAN NOT NULL DEFAULT false,
  cancelled BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurring_booking_id UUID REFERENCES public.recurring_bookings(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  guest_name TEXT,
  guest_phone TEXT,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT bookings_guest_or_user_check CHECK (
    user_id IS NOT NULL
    OR (guest_name IS NOT NULL AND guest_phone IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_bookings_date ON public.bookings(date);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_court_date ON public.bookings(court, date);
CREATE INDEX IF NOT EXISTS idx_bookings_recurring_booking_id ON public.bookings(recurring_booking_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date_cancelled ON public.bookings(date) WHERE cancelled = false;

-- ---------------------------------------------------------------------------
-- Recurring helpers (final versions from migrations)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_next_recurring_date(
  p_first_date DATE,
  p_interval_days INTEGER,
  p_from_date DATE DEFAULT CURRENT_DATE
) RETURNS DATE
LANGUAGE plpgsql
AS $$
DECLARE
  days_since_first INTEGER;
  cycles_completed INTEGER;
  next_date DATE;
BEGIN
  days_since_first := p_from_date - p_first_date;
  cycles_completed := FLOOR(days_since_first / p_interval_days);
  next_date := p_first_date + (cycles_completed * p_interval_days);

  IF next_date <= p_from_date THEN
    next_date := next_date + p_interval_days;
  END IF;

  RETURN next_date;
END;
$$;

CREATE OR REPLACE FUNCTION public.should_have_recurring_booking(
  p_recurring_id UUID,
  p_check_date DATE
) RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_first_date DATE;
  v_recurrence_interval_days INTEGER;
  v_diff_days INTEGER;
BEGIN
  SELECT first_date, recurrence_interval_days
  INTO v_first_date, v_recurrence_interval_days
  FROM public.recurring_bookings
  WHERE id = p_recurring_id AND active = true;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF p_check_date < v_first_date THEN
    RETURN FALSE;
  END IF;

  v_diff_days := p_check_date - v_first_date;
  RETURN (v_diff_days % v_recurrence_interval_days = 0);
END;
$$;

COMMENT ON FUNCTION public.should_have_recurring_booking(UUID, DATE) IS
  'Determines if a recurring booking should exist on a given date. Weekly by default, no end date.';

-- ---------------------------------------------------------------------------
-- RLS
-- Client uses anon/publishable key for auth + own profile.
-- Admin/API routes use service role (bypasses RLS).
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_bookings ENABLE ROW LEVEL SECURITY;

-- profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow authenticated users to call the RPC used by Turnero
GRANT EXECUTE ON FUNCTION public.should_have_recurring_booking(UUID, DATE) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_next_recurring_date(DATE, INTEGER, DATE) TO authenticated, anon;

-- Public turnero reads active recurring templates from the browser client.
DROP POLICY IF EXISTS "Anyone can view active recurring bookings" ON public.recurring_bookings;
CREATE POLICY "Anyone can view active recurring bookings"
  ON public.recurring_bookings FOR SELECT
  TO anon, authenticated
  USING (active = true);

-- Booking mutations go through API routes with the service role key (bypasses RLS).
