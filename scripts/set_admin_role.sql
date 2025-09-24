-- Set admin role for specific user
-- Replace 'rdcpulido@gmail.com' with your admin email if different

UPDATE public.profiles
SET role = 'admin', subscription_tier = 'premium'
WHERE email = 'rdcpulido@gmail.com';

-- If the profile doesn't exist yet, this will create it
INSERT INTO public.profiles (id, email, full_name, role, subscription_tier)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', 'Admin User'),
  'admin',
  'premium'
FROM auth.users au
WHERE au.email = 'rdcpulido@gmail.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = au.id
  );

-- Verify the admin role was set
SELECT id, email, role, subscription_tier
FROM public.profiles
WHERE email = 'rdcpulido@gmail.com';