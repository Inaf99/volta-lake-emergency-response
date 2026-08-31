-- ============================================================
-- Volta Lake Emergency Response System — seed data
--
-- IMPORTANT: user accounts (admin/passenger/operator/responder)
-- are NOT created here, because their passwords must be bcrypt
-- hashed and this plain .sql file cannot safely do that.
--
-- Run this instead, after schema.sql has been applied and
-- backend/.env is configured:
--
--   cd backend
--   npm install
--   npm run seed
--
-- That script (backend/src/utils/seed.js) creates:
--   - 1 admin, 1 passenger, 2 boat operators, 2 responders
--   - 2 demo boats, 1 active trip
--   - a handful of demo emergencies at various statuses
-- all with the password: password123
--
-- This file only seeds data that has NO password to hash:
-- the emergency contacts list, which the admin is required to
-- manage without touching source code.
-- ============================================================

INSERT INTO emergency_contacts (name, organization, phone, contact_type, description, priority, is_active) VALUES
('Volta Lake Rescue Team', 'Marine Emergency Response', '+233200000001', 'MARINE_RESCUE', 'Primary marine rescue unit covering the central Volta Lake basin.', 1, TRUE),
('Akosombo Police Post', 'Ghana Police Service', '+233200000002', 'POLICE', 'Nearest police post to Akosombo landing site.', 2, TRUE),
('Volta Fire Service Unit', 'Ghana National Fire Service', '+233200000003', 'FIRE_SERVICE', 'Handles boat/onshore fire emergencies near the dam area.', 2, TRUE),
('Lakeside Ambulance Dispatch', 'Ghana Ambulance Service', '+233200000004', 'AMBULANCE', 'Dispatches ambulances to landing sites for medical emergencies.', 1, TRUE),
('Volta Regional Hospital', 'Ministry of Health', '+233200000005', 'HOSPITAL', 'Nearest hospital equipped for trauma and drowning cases.', 3, TRUE),
('Boat Rescue Volunteers - Kete Krachi', 'Community Volunteer Corps', '+233200000006', 'BOAT_RESCUE_TEAM', 'Volunteer boat crew for the northern lake stretch.', 3, FALSE),
('Emergency Coordinator (Duty Officer)', 'LAERS Operations', '+233200000007', 'EMERGENCY_COORDINATOR', 'On-call coordinator for cross-agency response.', 1, TRUE);
