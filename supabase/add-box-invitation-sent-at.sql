-- Add box_invitation_sent_at column to contracts table
-- This tracks when Box invitation was first sent to the contractor

ALTER TABLE contracts
ADD COLUMN IF NOT EXISTS box_invitation_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN contracts.box_invitation_sent_at IS 'Box招待が最初に送信された日時';
