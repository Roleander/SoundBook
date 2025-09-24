-- Manually set admin role for a user by email
-- Replace 'your-email@example.com' with your actual email address

UPDATE profiles
SET role = 'admin', subscription_tier = 'premium'
WHERE id = (
  SELECT id FROM auth.users
  WHERE email = 'rdcpulido@gmail.com'
);

-- Verify the update
SELECT p.id, p.role, u.email
FROM profiles p
JOIN auth.users u ON p.id = u.id
WHERE u.email = 'rdcpulido@gmail.com';