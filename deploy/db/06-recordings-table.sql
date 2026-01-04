-- Create recordings table for call recording management

CREATE TABLE IF NOT EXISTS recordings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id UUID NOT NULL,
    organization_id UUID NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    format VARCHAR(10) NOT NULL DEFAULT 'wav',
    duration INT NOT NULL DEFAULT 0,
    size BIGINT NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'uploading',
    metadata JSONB,
    uploaded_at TIMESTAMP,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_recordings_call_id ON recordings(call_id);
CREATE INDEX IF NOT EXISTS idx_recordings_organization_id ON recordings(organization_id);
CREATE INDEX IF NOT EXISTS idx_recordings_status ON recordings(status);
CREATE INDEX IF NOT EXISTS idx_recordings_org_created ON recordings(organization_id, created_at DESC);

-- Add foreign key constraint to calls table (if exists)
-- ALTER TABLE recordings ADD CONSTRAINT fk_recordings_call_id FOREIGN KEY (call_id) REFERENCES calls(id) ON DELETE CASCADE;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON recordings TO psynq_user;

-- Add trigger to update updated_at automatically
CREATE OR REPLACE FUNCTION update_recordings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER recordings_updated_at
    BEFORE UPDATE ON recordings
    FOR EACH ROW
    EXECUTE FUNCTION update_recordings_updated_at();

-- Add comment
COMMENT ON TABLE recordings IS 'Stores metadata for call recordings uploaded to storage';
COMMENT ON COLUMN recordings.call_id IS 'Reference to the call that was recorded';
COMMENT ON COLUMN recordings.file_path IS 'Full path in storage (e.g., MinIO bucket path)';
COMMENT ON COLUMN recordings.duration IS 'Recording duration in seconds';
COMMENT ON COLUMN recordings.size IS 'File size in bytes';
COMMENT ON COLUMN recordings.status IS 'uploading, available, deleted, failed';
COMMENT ON COLUMN recordings.metadata IS 'Additional metadata (codec, sample rate, channels, bitrate)';
