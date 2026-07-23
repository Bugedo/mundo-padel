-- Clients (commercial profiles, no Auth) + link to bookings / recurring

CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clients_full_name ON public.clients (full_name);
CREATE INDEX IF NOT EXISTS idx_clients_phone ON public.clients (phone);
CREATE INDEX IF NOT EXISTS idx_clients_email ON public.clients (email);

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_client_id ON public.bookings(client_id);

ALTER TABLE public.recurring_bookings
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.recurring_bookings
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_recurring_bookings_client_id ON public.recurring_bookings(client_id);

ALTER TABLE public.recurring_bookings
  DROP CONSTRAINT IF EXISTS recurring_bookings_user_or_client_check;

ALTER TABLE public.recurring_bookings
  ADD CONSTRAINT recurring_bookings_user_or_client_check
  CHECK (user_id IS NOT NULL OR client_id IS NOT NULL);

-- Guest bookings still OK with guest_name/phone; admin-linked also set client_id
ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_guest_or_user_check;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_guest_or_user_check
  CHECK (
    user_id IS NOT NULL
    OR client_id IS NOT NULL
    OR (guest_name IS NOT NULL AND guest_phone IS NOT NULL)
  );

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
