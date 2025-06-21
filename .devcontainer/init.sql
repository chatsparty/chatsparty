-- Initialize PostgreSQL database for ChatsParty
-- This script runs when the PostgreSQL container starts for the first time

-- Create extensions that might be needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Set timezone
SET timezone = 'UTC';

-- Create a dedicated user for the application (optional)
-- CREATE USER chatsparty_user WITH PASSWORD 'chatsparty_password';
-- GRANT ALL PRIVILEGES ON DATABASE chatsparty TO chatsparty_user;

-- Set default privileges for future tables
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO chatsparty_user;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO chatsparty_user;

-- Log successful initialization
DO $$
BEGIN
    RAISE NOTICE 'ChatsParty database initialized successfully';
END $$; 