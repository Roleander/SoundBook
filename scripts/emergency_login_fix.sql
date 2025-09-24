-- Emergency fix to restore login functionality
-- This temporarily disables RLS on profiles to allow login, then fixes the policies

-- First, disable RLS temporarily
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Check if your profile exists and has the right role
SELECT p.*, u.email
FROM profiles p
JOIN auth.users u ON p.id = u.id
WHERE u.email = 'rdcpulido@gmail.com';

-- If profile doesn't exist, create it
INSERT INTO profiles (id, email, role, subscription_tier)
SELECT id, email, 'admin', 'premium'
FROM auth.users
WHERE email = 'rdcpulido@gmail.com'
ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  subscription_tier = 'premium';

-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop any problematic policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

-- Create correct policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON profiles TO authenticated;

-- Verify your admin status
SELECT p.role, u.email
FROM profiles p
JOIN auth.users u ON p.id = u.id
WHERE u.email = 'rdcpulido@gmail.com';