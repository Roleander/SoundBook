-- Complete database setup script combining all necessary fixes
-- Run this on your Supabase SQL editor to fix the admin area error

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tables if they don't exist
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user',
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium')),
  logo_url TEXT,
  subscription_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.series (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  author TEXT,
  narrator TEXT,
  genre TEXT,
  is_premium BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.audiobooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  series_id UUID REFERENCES public.series(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  audio_file_url TEXT NOT NULL,
  duration_seconds INTEGER,
  chapter_number INTEGER,
  is_premium BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.audio_choices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  audiobook_id UUID REFERENCES public.audiobooks(id) ON DELETE CASCADE,
  choice_text TEXT NOT NULL,
  choice_number INTEGER NOT NULL,
  voice_command TEXT NOT NULL,
  next_audiobook_id UUID REFERENCES public.audiobooks(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.listening_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  audiobook_id UUID REFERENCES public.audiobooks(id) ON DELETE CASCADE,
  progress_seconds INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  last_listened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, audiobook_id)
);

CREATE TABLE IF NOT EXISTS public.bookmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  audiobook_id UUID REFERENCES public.audiobooks(id) ON DELETE CASCADE,
  position_seconds INTEGER NOT NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  series_id UUID REFERENCES public.series(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, series_id)
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audiobooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audio_choices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listening_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Anyone can view series" ON series;
DROP POLICY IF EXISTS "Authenticated users can insert series" ON series;
DROP POLICY IF EXISTS "Authenticated users can update series" ON series;
DROP POLICY IF EXISTS "Authenticated users can delete series" ON series;
DROP POLICY IF EXISTS "Anyone can view audiobooks" ON audiobooks;
DROP POLICY IF EXISTS "Authenticated users can insert audiobooks" ON audiobooks;
DROP POLICY IF EXISTS "Authenticated users can update audiobooks" ON audiobooks;
DROP POLICY IF EXISTS "Authenticated users can delete audiobooks" ON audiobooks;
DROP POLICY IF EXISTS "Anyone can view audio choices" ON audio_choices;
DROP POLICY IF EXISTS "Authenticated users can insert audio choices" ON audio_choices;
DROP POLICY IF EXISTS "Authenticated users can update audio choices" ON audio_choices;
DROP POLICY IF EXISTS "Authenticated users can delete audio choices" ON audio_choices;
DROP POLICY IF EXISTS "Users can view their own progress" ON listening_progress;
DROP POLICY IF EXISTS "Users can update their own progress" ON listening_progress;
DROP POLICY IF EXISTS "Users can manage their own bookmarks" ON bookmarks;
DROP POLICY IF EXISTS "Users can manage their own favorites" ON favorites;

-- Drop existing triggers and functions first to avoid dependencies and return type conflicts
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.get_user_profile_safe(uuid);
DROP FUNCTION IF EXISTS public.get_user_profile(uuid);
DROP FUNCTION IF EXISTS public.update_user_profile_safe(uuid, text);
DROP FUNCTION IF EXISTS public.check_user_admin_safe(uuid);
DROP FUNCTION IF EXISTS public.check_user_role(uuid);
DROP FUNCTION IF EXISTS public.get_user_subscription_tier(uuid);
DROP FUNCTION IF EXISTS public.has_admin_users();
DROP FUNCTION IF EXISTS public.bootstrap_first_admin(uuid);
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create safe functions
CREATE OR REPLACE FUNCTION public.has_admin_users()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    admin_count integer;
BEGIN
    SELECT COUNT(*) INTO admin_count
    FROM profiles
    WHERE role = 'admin';

    RETURN admin_count > 0;
EXCEPTION
    WHEN OTHERS THEN
        RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.bootstrap_first_admin(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    admin_exists boolean;
    profile_exists boolean;
BEGIN
    SELECT public.has_admin_users() INTO admin_exists;

    IF admin_exists THEN
        RETURN false;
    END IF;

    SELECT EXISTS(SELECT 1 FROM profiles WHERE id = user_id) INTO profile_exists;

    IF NOT profile_exists THEN
        INSERT INTO profiles (id, role, subscription_tier)
        VALUES (user_id, 'admin', 'premium')
        ON CONFLICT (id) DO UPDATE SET role = 'admin';
    ELSE
        UPDATE profiles SET role = 'admin' WHERE id = user_id;
    END IF;

    RETURN true;
EXCEPTION
    WHEN OTHERS THEN
        RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_profile(user_id uuid)
RETURNS TABLE(id uuid, role text, subscription_tier text, logo_url text, full_name text, email text, created_at timestamptz, subscription_expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT p.id, p.role, p.subscription_tier, p.logo_url, p.full_name,
           (SELECT email FROM auth.users WHERE id = p.id) as email,
           p.created_at, p.subscription_expires_at
    FROM profiles p
    WHERE p.id = user_id;
EXCEPTION
    WHEN OTHERS THEN
        RETURN;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_profile_safe(user_id uuid)
RETURNS TABLE(id uuid, role text, subscription_tier text, logo_url text, full_name text, email text, created_at timestamptz, subscription_expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY SELECT * FROM public.get_user_profile(user_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_user_profile_safe(user_id uuid, new_full_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE profiles
    SET full_name = new_full_name
    WHERE id = user_id;

    RETURN FOUND;
EXCEPTION
    WHEN OTHERS THEN
        RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_user_admin_safe(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_role text;
BEGIN
    SELECT role INTO user_role
    FROM profiles
    WHERE id = user_id;

    RETURN COALESCE(user_role, 'user') = 'admin';
EXCEPTION
    WHEN OTHERS THEN
        RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_user_role(user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_role text;
BEGIN
    SELECT role INTO user_role
    FROM profiles
    WHERE id = user_id;

    RETURN COALESCE(user_role, 'user');
EXCEPTION
    WHEN OTHERS THEN
        RETURN 'user';
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_subscription_tier(user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    tier text;
BEGIN
    SELECT subscription_tier INTO tier
    FROM profiles
    WHERE id = user_id;

    RETURN COALESCE(tier, 'free');
EXCEPTION
    WHEN OTHERS THEN
        RETURN 'free';
END;
$$;

-- Create RLS policies
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON profiles
    FOR SELECT USING (public.check_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can update all profiles" ON profiles
    FOR UPDATE USING (public.check_user_role(auth.uid()) = 'admin');

CREATE POLICY "Anyone can view series" ON series
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert series" ON series
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update series" ON series
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete series" ON series
    FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Anyone can view audiobooks" ON audiobooks
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert audiobooks" ON audiobooks
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update audiobooks" ON audiobooks
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete audiobooks" ON audiobooks
    FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Anyone can view audio choices" ON audio_choices
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert audio choices" ON audio_choices
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update audio choices" ON audio_choices
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete audio choices" ON audio_choices
    FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can view their own progress" ON listening_progress
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress" ON listening_progress
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own bookmarks" ON bookmarks
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own favorites" ON favorites
    FOR ALL USING (auth.uid() = user_id);

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.has_admin_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.bootstrap_first_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_profile_safe(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_profile_safe(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_user_admin_safe(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_user_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_subscription_tier(uuid) TO authenticated;

-- Create trigger for profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
    RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();