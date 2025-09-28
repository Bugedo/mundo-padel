-- Migration: Remove seconds from all time fields
-- This will update all time fields to show HH:MM format instead of HH:MM:SS

-- Update recurring_bookings table - convert to text, remove seconds, convert back
UPDATE recurring_bookings 
SET 
  start_time = (start_time::text)::time,
  end_time = (end_time::text)::time
WHERE start_time::text LIKE '%:00' OR end_time::text LIKE '%:00';

-- Update bookings table - convert to text, remove seconds, convert back  
UPDATE bookings 
SET 
  start_time = (start_time::text)::time,
  end_time = (end_time::text)::time
WHERE start_time::text LIKE '%:00' OR end_time::text LIKE '%:00';

-- Alternative approach: Use date_trunc to remove seconds
UPDATE recurring_bookings 
SET 
  start_time = date_trunc('minute', start_time),
  end_time = date_trunc('minute', end_time);

UPDATE bookings 
SET 
  start_time = date_trunc('minute', start_time),
  end_time = date_trunc('minute', end_time);
