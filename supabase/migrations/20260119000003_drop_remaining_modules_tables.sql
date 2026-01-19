-- Fix: Drop remaining tables that weren't dropped in previous migration
-- The previous migration failed due to foreign key from generation_queue

DROP TABLE IF EXISTS generation_queue CASCADE;
DROP TABLE IF EXISTS content_blocks CASCADE;
DROP TABLE IF EXISTS generation_runs CASCADE;
DROP TABLE IF EXISTS modules CASCADE;
