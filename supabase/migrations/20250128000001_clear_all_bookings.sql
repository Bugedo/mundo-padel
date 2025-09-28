-- Migration: Clear all bookings from the database
-- This will delete all regular bookings but keep recurring_bookings and profiles intact

-- Delete all bookings
DELETE FROM bookings;

-- Optional: Reset any sequences if they exist
-- ALTER SEQUENCE IF EXISTS bookings_id_seq RESTART WITH 1;
