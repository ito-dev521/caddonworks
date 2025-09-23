-- Add organization column to users table
DO $$
BEGIN
    -- Check if the organization column already exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'users'
                   AND column_name = 'organization'
                   AND table_schema = 'public') THEN

        -- Add the organization column
        ALTER TABLE public.users
        ADD COLUMN organization TEXT;

        RAISE NOTICE 'Added organization column to users table';
    ELSE
        RAISE NOTICE 'Organization column already exists in users table';
    END IF;
END $$;