-- Add BOX account integration fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS box_email VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS box_user_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS box_oauth_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS box_oauth_refresh_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS box_oauth_expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS box_account_type VARCHAR(20) CHECK (box_account_type IN ('new', 'existing', null));

-- Add index for BOX user lookup
CREATE INDEX IF NOT EXISTS idx_users_box_user_id ON users(box_user_id);
CREATE INDEX IF NOT EXISTS idx_users_box_email ON users(box_email);

-- Add comment for documentation
COMMENT ON COLUMN users.box_email IS 'User BOX account email address';
COMMENT ON COLUMN users.box_user_id IS 'BOX user ID from OAuth';
COMMENT ON COLUMN users.box_oauth_token IS 'BOX OAuth access token (encrypted)';
COMMENT ON COLUMN users.box_oauth_refresh_token IS 'BOX OAuth refresh token (encrypted)';
COMMENT ON COLUMN users.box_oauth_expires_at IS 'BOX OAuth token expiration time';
COMMENT ON COLUMN users.box_account_type IS 'Whether user created new BOX account or linked existing one';