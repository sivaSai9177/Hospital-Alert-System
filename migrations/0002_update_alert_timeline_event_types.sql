-- Migration: Update alert_timeline_events event_type check constraint
-- Date: 2025-06-24
-- Description: Add 'urgency_changed' and 'note_added' to allowed event types

-- Drop the existing constraint
ALTER TABLE alert_timeline_events 
DROP CONSTRAINT IF EXISTS event_type_check;

-- Add the updated constraint with new event types
ALTER TABLE alert_timeline_events 
ADD CONSTRAINT event_type_check 
CHECK (event_type IN (
  'created', 
  'viewed', 
  'acknowledged', 
  'escalated', 
  'transferred', 
  'resolved', 
  'reopened', 
  'commented',
  'urgency_changed',
  'note_added'
));

-- Add comment to document the change
COMMENT ON CONSTRAINT event_type_check ON alert_timeline_events IS 'Valid event types for alert timeline tracking, including urgency changes and note additions';