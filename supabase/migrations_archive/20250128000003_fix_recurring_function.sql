-- Migration: Fix the should_have_recurring_booking function
-- The function is returning false for all dates, we need to recreate it properly

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS should_have_recurring_booking(UUID, DATE);

-- Create the corrected function
CREATE OR REPLACE FUNCTION should_have_recurring_booking(
    p_recurring_id UUID,
    p_check_date DATE
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_first_date DATE;
    v_last_date DATE;
    v_recurrence_interval_days INTEGER;
    v_diff_days INTEGER;
BEGIN
    -- Get the recurring booking details
    SELECT first_date, last_date, recurrence_interval_days
    INTO v_first_date, v_last_date, v_recurrence_interval_days
    FROM recurring_bookings
    WHERE id = p_recurring_id;

    -- If recurring booking not found
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- If check_date is before first_date
    IF p_check_date < v_first_date THEN
        RETURN FALSE;
    END IF;

    -- If check_date is after last_date (if last_date is set)
    IF v_last_date IS NOT NULL AND p_check_date > v_last_date THEN
        RETURN FALSE;
    END IF;

    -- Calculate the difference in days from the first occurrence
    v_diff_days := p_check_date - v_first_date;

    -- A booking should exist if the difference in days is a multiple of the recurrence interval
    -- For example: if first_date is 2025-09-15 and interval is 7:
    -- - 2025-09-15: diff = 0, 0 % 7 = 0 → TRUE
    -- - 2025-09-22: diff = 7, 7 % 7 = 0 → TRUE  
    -- - 2025-09-23: diff = 8, 8 % 7 = 1 → FALSE
    RETURN (v_diff_days % v_recurrence_interval_days = 0);
END;
$$;
