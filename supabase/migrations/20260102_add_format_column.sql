-- Add format column to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS format text DEFAULT 'reels';
