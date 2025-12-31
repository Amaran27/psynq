-- Migration: Add recording_path column to CDR table
-- Date: December 30, 2025
-- Description: Store the file path of call recordings for each call

-- Add recording_path column to CDR table
ALTER TABLE cdr 
ADD COLUMN IF NOT EXISTS recording_path VARCHAR(512);

-- Create index on recording_path for faster lookups
CREATE INDEX IF NOT EXISTS idx_cdr_recording_path 
ON cdr(recording_path);

-- Add comment for documentation
COMMENT ON COLUMN cdr.recording_path IS 'File path to call recording (e.g., /var/spool/asterisk/monitor/1767107916.1.wav)';

-- Grant permissions
GRANT SELECT, UPDATE ON cdr TO psynq_user;
