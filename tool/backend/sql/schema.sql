-- schema.sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE TYPE rti_direction AS ENUM ('sent','received');

-- Create Tables
-- SENDERS TABLE
CREATE TABLE IF NOT EXISTS senders (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR NOT NULL,
    email VARCHAR UNIQUE,
    address VARCHAR,
    contact_no VARCHAR UNIQUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- POSITIONS TABLE
CREATE TABLE IF NOT EXISTS positions (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- INSTITUTIONS TABLE
CREATE TABLE IF NOT EXISTS institutions (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- RECEIVERS TABLE
CREATE TABLE IF NOT EXISTS receivers (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    position_id uuid REFERENCES positions(id),
    institution_id uuid REFERENCES institutions(id),
    email VARCHAR UNIQUE,
    address VARCHAR,
    contact_no VARCHAR UNIQUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- RTI TEMPLATES TABLE
CREATE TABLE IF NOT EXISTS rti_templates (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR NOT NULL,
    description TEXT,
    file VARCHAR NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- RTI REQUESTS TABLE
CREATE TABLE IF NOT EXISTS rti_requests (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR NOT NULL,
    description TEXT,
    sender_id uuid REFERENCES senders(id),
    receiver_id uuid REFERENCES receivers(id),
    rti_template_id uuid REFERENCES rti_templates(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- RTI STATUSES TABLE
CREATE TABLE IF NOT EXISTS rti_statuses (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- RTI STATUS HISTORIES TABLE
CREATE TABLE IF NOT EXISTS rti_status_histories (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    rti_request_id uuid REFERENCES rti_requests(id),
    status_id uuid REFERENCES rti_statuses(id),
    direction rti_direction DEFAULT 'sent' NOT NULL,
    description TEXT NOT NULL,
    entry_time TIMESTAMPTZ NOT NULL,
    exit_time TIMESTAMPTZ,
    file VARCHAR,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Foreign Key Indexes 
-- Receivers TABLE
CREATE INDEX IF NOT EXISTS idx_receivers_position_id ON receivers(position_id);
CREATE INDEX IF NOT EXISTS idx_receivers_institution_id ON receivers(institution_id);

-- RTI REQUESTS TABLE
CREATE INDEX IF NOT EXISTS idx_rti_requests_sender_id ON rti_requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_rti_requests_receiver_id ON rti_requests(receiver_id);
CREATE INDEX IF NOT EXISTS idx_rti_requests_rti_template_id ON rti_requests(rti_template_id);

-- RTI STATUS HISTORIES TABLE
CREATE INDEX IF NOT EXISTS idx_rti_status_histories_rti_request_id ON rti_status_histories(rti_request_id);
CREATE INDEX IF NOT EXISTS idx_rti_status_histories_status_id ON rti_status_histories(status_id);
