-- Migration: Refactor recurring_bookings to use exact dates instead of day_of_week
-- This migration adds new columns and migrates existing data

-- Step 1: Add new columns to recurring_bookings table
ALTER TABLE recurring_bookings 
ADD COLUMN first_date DATE,
ADD COLUMN last_date DATE,
ADD COLUMN recurrence_interval_days INTEGER DEFAULT 7;

-- Step 2: Migrate existing data
-- For each recurring booking, calculate the first_date based on start_date or create a default
UPDATE recurring_bookings 
SET 
  first_date = COALESCE(start_date::DATE, CURRENT_DATE),
  recurrence_interval_days = 7
WHERE first_date IS NULL;

-- Step 3: If last_date exists, migrate it
UPDATE recurring_bookings 
SET last_date = end_date::DATE
WHERE end_date IS NOT NULL AND last_date IS NULL;

-- Step 4: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_recurring_bookings_first_date ON recurring_bookings(first_date);
CREATE INDEX IF NOT EXISTS idx_recurring_bookings_last_date ON recurring_bookings(last_date);
CREATE INDEX IF NOT EXISTS idx_recurring_bookings_active_first_date ON recurring_bookings(active, first_date) WHERE active = true;

-- Step 5: Add constraints
ALTER TABLE recurring_bookings 
ADD CONSTRAINT check_recurrence_interval_positive 
CHECK (recurrence_interval_days > 0);

ALTER TABLE recurring_bookings 
ADD CONSTRAINT check_first_date_not_null 
CHECK (first_date IS NOT NULL);

-- Step 6: Add comment explaining the new structure
COMMENT ON COLUMN recurring_bookings.first_date IS 'Exact date of the first recurring booking instance';
COMMENT ON COLUMN recurring_bookings.last_date IS 'Exact date of the last recurring booking instance (optional)';
COMMENT ON COLUMN recurring_bookings.recurrence_interval_days IS 'Days between recurring instances (7 for weekly, 14 for bi-weekly, etc.)';

-- Step 7: Create a function to generate next booking date
CREATE OR REPLACE FUNCTION get_next_recurring_date(
  p_first_date DATE,
  p_interval_days INTEGER,
  p_from_date DATE DEFAULT CURRENT_DATE
) RETURNS DATE AS $$
DECLARE
  days_since_first INTEGER;
  cycles_completed INTEGER;
  next_date DATE;
BEGIN
  -- Calculate days since first date
  days_since_first := p_from_date - p_first_date;
  
  -- Calculate how many complete cycles have passed
  cycles_completed := FLOOR(days_since_first / p_interval_days);
  
  -- Calculate next date
  next_date := p_first_date + (cycles_completed * p_interval_days);
  
  -- If next_date is in the past or today, get the next occurrence
  IF next_date <= p_from_date THEN
    next_date := next_date + p_interval_days;
  END IF;
  
  RETURN next_date;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Create a function to check if a date should have a recurring booking
CREATE OR REPLACE FUNCTION should_have_recurring_booking(
  p_recurring_id UUID,
  p_check_date DATE
) RETURNS BOOLEAN AS $$
DECLARE
  recurring_record RECORD;
  next_expected_date DATE;
BEGIN
  -- Get the recurring booking details
  SELECT first_date, last_date, recurrence_interval_days, active
  INTO recurring_record
  FROM recurring_bookings
  WHERE id = p_recurring_id;
  
  -- If recurring booking doesn't exist or is inactive, return false
  IF NOT FOUND OR NOT recurring_record.active THEN
    RETURN FALSE;
  END IF;
  
  -- If check_date is before first_date, return false
  IF p_check_date < recurring_record.first_date THEN
    RETURN FALSE;
  END IF;
  
  -- If last_date is set and check_date is after it, return false
  IF recurring_record.last_date IS NOT NULL AND p_check_date > recurring_record.last_date THEN
    RETURN FALSE;
  END IF;
  
  -- Calculate the expected date for this recurring booking
  next_expected_date := get_next_recurring_date(
    recurring_record.first_date,
    recurring_record.recurrence_interval_days,
    p_check_date
  );
  
  -- Return true if the check_date matches the expected date
  RETURN p_check_date = next_expected_date;
END;
$$ LANGUAGE plpgsql;
