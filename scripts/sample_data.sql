-- Sample data for testing the AudioStory application
-- Run this after the complete_database_setup.sql script

-- Insert sample series
INSERT INTO public.series (title, description, author, narrator, genre, is_premium, cover_image_url) VALUES
('The Lost Kingdom', 'An epic adventure through ancient ruins and forgotten civilizations.', 'Dr. Elena Vasquez', 'Marcus Chen', 'Adventure', false, '/placeholder.svg'),
('Whispers in the Dark', 'A psychological thriller about a detective investigating paranormal occurrences.', 'Sarah Mitchell', 'Victoria Lang', 'Thriller', true, '/placeholder.svg'),
('Starbound Chronicles', 'Journey through the cosmos in this space opera adventure.', 'Captain Orion Black', 'Alex Rivera', 'Science Fiction', true, '/placeholder.svg'),
('The Enchanted Forest', 'A magical tale of friendship and discovery in a hidden woodland realm.', 'Lily Evergreen', 'Emma Thompson', 'Fantasy', false, '/placeholder.svg');

-- Insert sample audiobooks for "The Lost Kingdom" series
INSERT INTO public.audiobooks (series_id, title, description, audio_file_url, duration_seconds, chapter_number, is_premium) VALUES
((SELECT id FROM series WHERE title = 'The Lost Kingdom'), 'Chapter 1: The Discovery', 'Dr. Vasquez discovers an ancient artifact that leads her on an unexpected journey.', '/placeholder-audio.mp3', 1800, 1, false),
((SELECT id FROM series WHERE title = 'The Lost Kingdom'), 'Chapter 2: The Hidden Temple', 'Exploring the dangerous ruins of an ancient temple filled with traps and treasures.', '/placeholder-audio.mp3', 2100, 2, false),
((SELECT id FROM series WHERE title = 'The Lost Kingdom'), 'Chapter 3: The Guardian''s Challenge', 'Facing the temple guardian in an epic confrontation.', '/placeholder-audio.mp3', 1950, 3, false);

-- Insert sample audiobooks for "Whispers in the Dark" series
INSERT INTO public.audiobooks (series_id, title, description, audio_file_url, duration_seconds, chapter_number, is_premium) VALUES
((SELECT id FROM series WHERE title = 'Whispers in the Dark'), 'Chapter 1: The First Case', 'Detective Mitchell takes on her first paranormal investigation.', '/placeholder-audio.mp3', 1650, 1, true),
((SELECT id FROM series WHERE title = 'Whispers in the Dark'), 'Chapter 2: Midnight Whispers', 'Strange occurrences plague the old mansion at night.', '/placeholder-audio.mp3', 1780, 2, true);

-- Insert sample audiobooks for "The Enchanted Forest" series
INSERT INTO public.audiobooks (series_id, title, description, audio_file_url, duration_seconds, chapter_number, is_premium) VALUES
((SELECT id FROM series WHERE title = 'The Enchanted Forest'), 'Chapter 1: The Hidden Path', 'Young Lily discovers a magical path leading to an enchanted forest.', '/placeholder-audio.mp3', 1200, 1, false),
((SELECT id FROM series WHERE title = 'The Enchanted Forest'), 'Chapter 2: Meeting the Fairies', 'Lily befriends the forest inhabitants and learns about their world.', '/placeholder-audio.mp3', 1350, 2, false),
((SELECT id FROM series WHERE title = 'The Enchanted Forest'), 'Chapter 3: The Crystal Cave', 'An adventure deep into the crystal caves beneath the forest.', '/placeholder-audio.mp3', 1500, 3, false);

-- Insert interactive choices for "The Lost Kingdom" Chapter 3
INSERT INTO public.audio_choices (audiobook_id, choice_text, choice_number, voice_command, next_audiobook_id) VALUES
((SELECT id FROM audiobooks WHERE title = 'Chapter 3: The Guardian''s Challenge'), 'Fight the Guardian head-on', 1, 'fight', NULL),
((SELECT id FROM audiobooks WHERE title = 'Chapter 3: The Guardian''s Challenge'), 'Try to negotiate with the Guardian', 2, 'negotiate', NULL),
((SELECT id FROM audiobooks WHERE title = 'Chapter 3: The Guardian''s Challenge'), 'Look for a way around the Guardian', 3, 'sneak', NULL);

-- Insert interactive choices for "Whispers in the Dark" Chapter 2
INSERT INTO public.audio_choices (audiobook_id, choice_text, choice_number, voice_command, next_audiobook_id) VALUES
((SELECT id FROM audiobooks WHERE title = 'Chapter 2: Midnight Whispers'), 'Investigate the basement', 1, 'basement', NULL),
((SELECT id FROM audiobooks WHERE title = 'Chapter 2: Midnight Whispers'), 'Check the attic', 2, 'attic', NULL),
((SELECT id FROM audiobooks WHERE title = 'Chapter 2: Midnight Whispers'), 'Call for backup', 3, 'backup', NULL);

-- Insert interactive choices for "The Enchanted Forest" Chapter 3
INSERT INTO public.audio_choices (audiobook_id, choice_text, choice_number, voice_command, next_audiobook_id) VALUES
((SELECT id FROM audiobooks WHERE title = 'Chapter 3: The Crystal Cave'), 'Touch the glowing crystal', 1, 'touch', NULL),
((SELECT id FROM audiobooks WHERE title = 'Chapter 3: The Crystal Cave'), 'Leave the crystal alone', 2, 'leave', NULL),
((SELECT id FROM audiobooks WHERE title = 'Chapter 3: The Crystal Cave'), 'Ask the fairies for advice', 3, 'ask', NULL);