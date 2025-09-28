-- Migration: Fix time format to remove seconds
-- This will properly convert all time fields to HH:MM format

-- Update recurring_bookings table
UPDATE recurring_bookings 
SET 
  start_time = to_char(start_time, 'HH24:MI')::time,
  end_time = to_char(end_time, 'HH24:MI')::time;

-- Update bookings table
UPDATE bookings 
SET 
  start_time = to_char(start_time, 'HH24:MI')::time,
  end_time = to_char(end_time, 'HH24:MI')::time;
