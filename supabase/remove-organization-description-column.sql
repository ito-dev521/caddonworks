-- Remove description column from organizations table
-- This script safely removes the unused description column

-- First, check if the column exists before attempting to drop it
DO $$
BEGIN
    -- Check if description column exists
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'organizations'
        AND column_name = 'description'
        AND table_schema = 'public'
    ) THEN
        -- Drop the description column
        ALTER TABLE organizations DROP COLUMN description;
        RAISE NOTICE 'Description column successfully removed from organizations table';
    ELSE
        RAISE NOTICE 'Description column does not exist in organizations table';
    END IF;
END $$;