-- Check for existing test user and clean up if needed
-- First check if the user exists
SELECT
    u.id,
    u.auth_user_id,
    u.email,
    u.display_name,
    m.role,
    m.org_id
FROM users u
LEFT JOIN memberships m ON u.id = m.user_id
WHERE u.email ILIKE '%iistylelab%';

-- If you want to delete the test user, uncomment the following:
--
-- -- Delete memberships first (foreign key constraint)
-- DELETE FROM memberships
-- WHERE user_id IN (
--     SELECT id FROM users WHERE email ILIKE '%iistylelab%'
-- );
--
-- -- Then delete the user profile
-- DELETE FROM users WHERE email ILIKE '%iistylelab%';
--
-- -- Note: You'll also need to delete the auth user from Supabase Auth
-- -- This can be done in the Supabase dashboard under Authentication > Users