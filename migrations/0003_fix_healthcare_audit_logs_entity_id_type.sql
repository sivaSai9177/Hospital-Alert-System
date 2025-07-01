-- Fix healthcare_audit_logs entity_id column type
-- Change from UUID to TEXT to support both user IDs (text) and other entity IDs (UUID)

-- First, alter the column type
ALTER TABLE healthcare_audit_logs 
ALTER COLUMN entity_id TYPE TEXT;

-- Add a comment to explain why this column is TEXT
COMMENT ON COLUMN healthcare_audit_logs.entity_id IS 'Entity ID can be either a user ID (text) or other entity UUID, stored as text';