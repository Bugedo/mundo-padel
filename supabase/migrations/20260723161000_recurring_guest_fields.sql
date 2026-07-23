-- Denormalized guest identity on recurring templates (copied from clients on create)
ALTER TABLE public.recurring_bookings
  ADD COLUMN IF NOT EXISTS guest_name TEXT,
  ADD COLUMN IF NOT EXISTS guest_phone TEXT;
