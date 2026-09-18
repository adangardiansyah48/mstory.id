-- Migration: add icon column to categories (Idempotent)
ALTER TABLE categories ADD COLUMN IF NOT EXISTS icon VARCHAR(64) DEFAULT NULL;

UPDATE categories SET icon = 'Gem'         WHERE name = 'WEDDING' AND icon IS NULL;
UPDATE categories SET icon = 'Camera'      WHERE name = 'PRAWEDDING' AND icon IS NULL;
UPDATE categories SET icon = 'Heart'       WHERE name = 'ENGAGEMENT' AND icon IS NULL;
UPDATE categories SET icon = 'PartyPopper' WHERE name = 'EVENT' AND icon IS NULL;
UPDATE categories SET icon = 'Clapperboard' WHERE name = 'WEDDING CONTENT CREATOR' AND icon IS NULL;
UPDATE categories SET icon = 'GraduationCap' WHERE name = 'GRADUATION' AND icon IS NULL;