-- Migration: Remove old columns from recurring_bookings table
-- This will remove day_of_week, start_date, and end_date columns that are no longer needed

-- Remove the old day_of_week column
ALTER TABLE recurring_bookings DROP COLUMN IF EXISTS day_of_week;

-- Remove redundant start_date and end_date columns (we now use first_date and last_date)
ALTER TABLE recurring_bookings DROP COLUMN IF EXISTS start_date;
ALTER TABLE recurring_bookings DROP COLUMN IF EXISTS end_date;

-- Verify the table structure
-- The table should now only have: id, user_id, court, start_time, end_time, duration_minutes, 
-- active, created_at, updated_at, first_date, last_date, recurrence_interval_days
