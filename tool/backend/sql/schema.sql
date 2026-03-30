-- schema.sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create Tables
-- SENDERS TABLE
CREATE TABLE IF NOT EXISTS senders (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR NOT NULL,
    email VARCHAR NOT NULL UNIQUE,
    contact_no VARCHAR NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- POSITIONS TABLE
CREATE TABLE IF NOT EXISTS positions (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- INSTITUTIONS TABLE
CREATE TABLE IF NOT EXISTS institutions (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- RECEIVERS TABLE
CREATE TABLE IF NOT EXISTS receivers (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    position_id uuid REFERENCES positions(id),
    institution_id uuid REFERENCES institutions(id),
    email VARCHAR NOT NULL UNIQUE,
    contact_no VARCHAR NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- RTI TEMPLATES TABLE
CREATE TABLE IF NOT EXISTS rti_templates (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR NOT NULL,
    description TEXT NOT NULL,
    file VARCHAR NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- RTI REQUESTS TABLE
CREATE TABLE IF NOT EXISTS rti_requests (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR NOT NULL,
    description TEXT NOT NULL,
    sender_id uuid REFERENCES senders(id),
    receiver_id uuid REFERENCES receivers(id),
    rti_template_id uuid REFERENCES rti_templates(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- STATUS TABLE
CREATE TABLE IF NOT EXISTS status (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- STATUS HISTORY
CREATE TABLE IF NOT EXISTS rti_status_history (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    rti_request_id uuid REFERENCES rti_requests(id),
    status_id uuid REFERENCES status(id),
    direction VARCHAR DEFAULT 'sent' NOT NULL,
    description TEXT NOT NULL,
    entry_time TIMESTAMP NOT NULL,
    exit_time TIMESTAMP,
    file VARCHAR,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
