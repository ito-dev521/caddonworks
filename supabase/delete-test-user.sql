-- Delete test user (iistylelab@gmail.com) completely
-- This will clean up the database for fresh testing

DO $$
DECLARE
    user_record RECORD;
BEGIN
    -- Find the user record
    SELECT id, auth_user_id, email INTO user_record
    FROM users
    WHERE email ILIKE '%iistylelab%'
    LIMIT 1;

    IF user_record.id IS NOT NULL THEN
        RAISE NOTICE 'Found test user: % (ID: %, Auth ID: %)',
            user_record.email, user_record.id, user_record.auth_user_id;

        -- Delete from memberships first (foreign key constraint)
        DELETE FROM memberships WHERE user_id = user_record.id;
        RAISE NOTICE 'Deleted memberships for user %', user_record.id;

        -- Delete from any other related tables (if they exist)
        -- Add more DELETE statements here if there are other tables referencing users.id

        -- Delete the user profile
        DELETE FROM users WHERE id = user_record.id;
        RAISE NOTICE 'Deleted user profile for %', user_record.email;

        RAISE NOTICE 'Successfully cleaned up test user. You still need to delete the auth user manually from Supabase Auth dashboard.';
    ELSE
        RAISE NOTICE 'No test user found with email containing "iistylelab"';
    END IF;
END $$;