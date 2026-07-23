-- Guest booking support: name/phone without auth user
-- Pending bookings hold the slot until admin accepts or rejects (no expiry)

ALTER TABLE public.bookings
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS guest_name TEXT,
  ADD COLUMN IF NOT EXISTS guest_phone TEXT;

-- Either a linked profile OR guest identity is required
ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_guest_or_user_check;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_guest_or_user_check
  CHECK (
    user_id IS NOT NULL
    OR (guest_name IS NOT NULL AND guest_phone IS NOT NULL)
  );

COMMENT ON COLUMN public.bookings.guest_name IS 'Name for guest booking requests without an auth account';
COMMENT ON COLUMN public.bookings.guest_phone IS 'Phone for guest booking requests (WhatsApp contact)';
