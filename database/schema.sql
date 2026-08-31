-- ============================================================
-- Volta Lake Emergency Response System — PostgreSQL schema
-- Run this after creating the database:
--   createdb volta_lake_emergency
--   psql -d volta_lake_emergency -f database/schema.sql
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- for gen_random_uuid()

-- ---------- ENUM TYPES ----------
CREATE TYPE user_role AS ENUM ('PASSENGER', 'BOAT_OPERATOR', 'RESPONDER', 'ADMIN');

CREATE TYPE emergency_type AS ENUM (
  'BOAT_SINKING', 'BOAT_CAPSIZING', 'PERSON_OVERBOARD', 'MEDICAL_EMERGENCY',
  'COLLISION', 'FIRE', 'ENGINE_FAILURE', 'MISSING_BOAT_PERSON',
  'BAD_WEATHER', 'SECURITY_THREAT', 'OTHER'
);

CREATE TYPE emergency_priority AS ENUM ('CRITICAL', 'HIGH', 'NORMAL');

CREATE TYPE emergency_status AS ENUM (
  'NEW', 'ACKNOWLEDGED', 'RESPONDER_ASSIGNED', 'RESPONSE_IN_PROGRESS', 'ARRIVED', 'RESOLVED', 'CANCELLED'
);

CREATE TYPE trip_status AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

CREATE TYPE responder_availability AS ENUM ('AVAILABLE', 'BUSY', 'OFFLINE');

CREATE TYPE contact_type AS ENUM (
  'MARINE_RESCUE', 'POLICE', 'FIRE_SERVICE', 'AMBULANCE', 'HOSPITAL',
  'BOAT_RESCUE_TEAM', 'EMERGENCY_COORDINATOR', 'OTHER'
);

CREATE TYPE sms_status AS ENUM ('PENDING', 'SENT', 'FAILED', 'SIMULATED');

CREATE TYPE notification_type AS ENUM ('EMERGENCY_ALERT', 'STATUS_UPDATE', 'SYSTEM');

CREATE TYPE notification_status AS ENUM ('PENDING', 'DELIVERED', 'FAILED');

-- ---------- USERS ----------
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(150) NOT NULL,
  phone VARCHAR(20) NOT NULL UNIQUE,
  email VARCHAR(150) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role user_role NOT NULL DEFAULT 'PASSENGER',
  emergency_contact_name VARCHAR(150),
  emergency_contact_phone VARCHAR(20),
  profile_photo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_phone ON users(phone);

-- ---------- BOATS ----------
CREATE TABLE boats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  boat_name VARCHAR(100) NOT NULL,
  registration_number VARCHAR(50) NOT NULL UNIQUE,
  boat_type VARCHAR(50) NOT NULL DEFAULT 'PASSENGER_BOAT',
  passenger_capacity INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE | MAINTENANCE | DECOMMISSIONED
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_boats_operator ON boats(operator_id);

-- ---------- TRIPS ----------
CREATE TABLE trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boat_id UUID NOT NULL REFERENCES boats(id) ON DELETE CASCADE,
  operator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  departure_location VARCHAR(150),
  destination VARCHAR(150),
  start_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_time TIMESTAMPTZ,
  current_latitude DOUBLE PRECISION,
  current_longitude DOUBLE PRECISION,
  status trip_status NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_trips_boat ON trips(boat_id);
CREATE INDEX idx_trips_status ON trips(status);

-- ---------- RESPONDERS ----------
CREATE TABLE responders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  responder_type VARCHAR(50) NOT NULL DEFAULT 'MARINE_RESCUE',
  current_latitude DOUBLE PRECISION,
  current_longitude DOUBLE PRECISION,
  availability_status responder_availability NOT NULL DEFAULT 'AVAILABLE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_responders_user ON responders(user_id);
CREATE INDEX idx_responders_availability ON responders(availability_status);

-- ---------- EMERGENCIES ----------
CREATE TABLE emergencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES users(id),
  boat_id UUID REFERENCES boats(id),
  trip_id UUID REFERENCES trips(id),
  emergency_type emergency_type NOT NULL,
  description TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  location_accuracy DOUBLE PRECISION,
  priority emergency_priority NOT NULL DEFAULT 'NORMAL',
  status emergency_status NOT NULL DEFAULT 'NEW',
  assigned_responder_id UUID REFERENCES responders(id),
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  acknowledged_at TIMESTAMPTZ,
  assigned_at TIMESTAMPTZ,
  arrived_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_emergencies_status ON emergencies(status);
CREATE INDEX idx_emergencies_priority ON emergencies(priority);
CREATE INDEX idx_emergencies_reporter ON emergencies(reporter_id);
CREATE INDEX idx_emergencies_created ON emergencies(created_at DESC);

-- ---------- EMERGENCY CONTACTS (admin-managed, no hard-coded numbers) ----------
CREATE TABLE emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  organization VARCHAR(150),
  phone VARCHAR(20) NOT NULL,
  contact_type contact_type NOT NULL DEFAULT 'OTHER',
  description TEXT,
  priority INTEGER NOT NULL DEFAULT 1, -- 1 = highest
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_contacts_active ON emergency_contacts(is_active);

-- ---------- NOTIFICATIONS (in-app / push log) ----------
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID REFERENCES users(id) ON DELETE CASCADE,
  emergency_id UUID REFERENCES emergencies(id) ON DELETE CASCADE,
  notification_type notification_type NOT NULL DEFAULT 'EMERGENCY_ALERT',
  message TEXT NOT NULL,
  status notification_status NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX idx_notifications_emergency ON notifications(emergency_id);

-- ---------- SMS LOGS ----------
CREATE TABLE sms_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emergency_id UUID REFERENCES emergencies(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES emergency_contacts(id),
  recipient_phone VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  provider VARCHAR(30) NOT NULL DEFAULT 'demo',
  status sms_status NOT NULL DEFAULT 'PENDING',
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sms_logs_emergency ON sms_logs(emergency_id);
CREATE INDEX idx_sms_logs_status ON sms_logs(status);

-- ---------- LOCATION HISTORY ----------
CREATE TABLE location_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  boat_id UUID REFERENCES boats(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_location_history_user ON location_history(user_id);
CREATE INDEX idx_location_history_boat ON location_history(boat_id);
CREATE INDEX idx_location_history_time ON location_history(recorded_at DESC);

-- ---------- AUDIT LOGS ----------
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,           -- e.g. EMERGENCY_STATUS_CHANGED
  entity_type VARCHAR(50) NOT NULL,       -- e.g. emergency, emergency_contact
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- ---------- updated_at trigger helper ----------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_boats_updated_at BEFORE UPDATE ON boats FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_responders_updated_at BEFORE UPDATE ON responders FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_emergencies_updated_at BEFORE UPDATE ON emergencies FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_contacts_updated_at BEFORE UPDATE ON emergency_contacts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
