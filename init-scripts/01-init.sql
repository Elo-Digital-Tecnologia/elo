-- Elo Digital Database Initialization Script
-- This script runs on first database initialization

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
CREATE TYPE user_role AS ENUM (
    'superadmin',
    'admin_elo',
    'admin_restaurant',
    'waiter',
    'kitchen',
    'cashier'
);

CREATE TYPE order_status AS ENUM (
    'draft',
    'pending_validation',
    'sent',
    'received',
    'preparing',
    'ready',
    'delivered',
    'cancelled',
    'closed'
);

CREATE TYPE table_status AS ENUM (
    'free',
    'occupied',
    'reserved',
    'cleaning',
    'maintenance'
);

CREATE TYPE call_status AS ENUM (
    'pending',
    'responded',
    'cancelled'
);

CREATE TYPE bill_status AS ENUM (
    'open',
    'closed',
    'paid',
    'cancelled'
);

CREATE TYPE split_type AS ENUM (
    'none',
    'equal',
    'by_item'
);

CREATE TYPE payment_method AS ENUM (
    'cash',
    'pix',
    'bank_transfer',
    'card',
    'other'
);

CREATE TYPE payment_status AS ENUM (
    'pending',
    'confirmed',
    'failed',
    'refunded'
);

CREATE TYPE subscription_status AS ENUM (
    'active',
    'trialing',
    'past_due',
    'grace_period',
    'suspended',
    'cancelled',
    'expired'
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create initial superadmin user (will be created by application on first run)
-- This is just a placeholder - the application will create the actual superadmin

-- Create default service charge configuration for new restaurants
-- This will be handled by the application

-- Create indexes for performance (will be created by TypeORM migrations)

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO elo_digital;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO elo_digital;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO elo_digital;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO elo_digital;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO elo_digital;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO elo_digital;