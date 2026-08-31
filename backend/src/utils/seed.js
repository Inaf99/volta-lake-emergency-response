// Seeds demo accounts, boats, a trip, and a few emergencies so the app
// can be demonstrated immediately after `npm run seed`.
// Run with:  cd backend && npm run seed
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool, testConnection } = require('../config/db');

const DEMO_PASSWORD = 'password123';

async function upsertUser({ full_name, phone, email, role }) {
  const existing = await pool.query('SELECT id FROM users WHERE phone = $1', [phone]);
  if (existing.rows[0]) return existing.rows[0];

  const password_hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const { rows } = await pool.query(
    `INSERT INTO users (full_name, phone, email, password_hash, role)
     VALUES ($1,$2,$3,$4,$5) RETURNING id`,
    [full_name, phone, email, password_hash, role]
  );
  return rows[0];
}

async function main() {
  const connected = await testConnection();
  if (!connected) {
    console.error('Cannot seed: database is not reachable. Check backend/.env DATABASE_URL.');
    process.exit(1);
  }

  console.log('Seeding demo users...');
  const admin = await upsertUser({ full_name: 'Admin User', phone: '+233240000001', email: 'admin@volta-laers.test', role: 'ADMIN' });
  const passenger = await upsertUser({ full_name: 'Ama Boateng', phone: '+233240000002', email: 'ama@volta-laers.test', role: 'PASSENGER' });
  const operator1 = await upsertUser({ full_name: 'Kwesi Mensah', phone: '+233240000003', email: 'kwesi@volta-laers.test', role: 'BOAT_OPERATOR' });
  const operator2 = await upsertUser({ full_name: 'Efua Owusu', phone: '+233240000004', email: 'efua@volta-laers.test', role: 'BOAT_OPERATOR' });
  const responderUser1 = await upsertUser({ full_name: 'Yaw Darko', phone: '+233240000005', email: 'yaw@volta-laers.test', role: 'RESPONDER' });
  const responderUser2 = await upsertUser({ full_name: 'Nana Yeboah', phone: '+233240000006', email: 'nana@volta-laers.test', role: 'RESPONDER' });

  console.log('Seeding responders...');
  async function upsertResponder(userId, lat, lng) {
    const existing = await pool.query('SELECT id FROM responders WHERE user_id = $1', [userId]);
    if (existing.rows[0]) return existing.rows[0];
    const { rows } = await pool.query(
      `INSERT INTO responders (user_id, responder_type, current_latitude, current_longitude, availability_status)
       VALUES ($1,'MARINE_RESCUE',$2,$3,'AVAILABLE') RETURNING id`,
      [userId, lat, lng]
    );
    return rows[0];
  }
  await upsertResponder(responderUser1.id, 7.2050, -0.1650);
  await upsertResponder(responderUser2.id, 7.1900, -0.1500);

  console.log('Seeding boats...');
  async function upsertBoat(operatorId, name, reg, capacity) {
    const existing = await pool.query('SELECT id FROM boats WHERE registration_number = $1', [reg]);
    if (existing.rows[0]) return existing.rows[0];
    const { rows } = await pool.query(
      `INSERT INTO boats (operator_id, boat_name, registration_number, boat_type, passenger_capacity)
       VALUES ($1,$2,$3,'PASSENGER_BOAT',$4) RETURNING id`,
      [operatorId, name, reg, capacity]
    );
    return rows[0];
  }
  const boat1 = await upsertBoat(operator1.id, 'Lake Pride', 'VOLTA-023', 24);
  const boat2 = await upsertBoat(operator2.id, 'Akosombo Star', 'VOLTA-011', 18);

  console.log('Seeding an active trip...');
  const activeTrip = await pool.query('SELECT id FROM trips WHERE boat_id = $1 AND status = $2', [boat1.id, 'ACTIVE']);
  let tripId = activeTrip.rows[0]?.id;
  if (!tripId) {
    const { rows } = await pool.query(
      `INSERT INTO trips (boat_id, operator_id, departure_location, destination, current_latitude, current_longitude, status)
       VALUES ($1,$2,'Akosombo Landing','Kete Krachi',7.2130,-0.1745,'ACTIVE') RETURNING id`,
      [boat1.id, operator1.id]
    );
    tripId = rows[0].id;
  }

  console.log('Seeding demo emergency contacts (if not already present)...');
  const contactCount = await pool.query('SELECT COUNT(*) FROM emergency_contacts');
  if (Number(contactCount.rows[0].count) === 0) {
    console.log('  -> none found; run database/seed.sql first for the contact list.');
  }

  console.log('Seeding sample emergencies at different statuses...');
    async function upsertEmergency(type, status, priority, lat, lng, reporterId, boatId, tripIdArg, responderId) {
    const { rows } = await pool.query(
      `SELECT id FROM emergencies WHERE reporter_id = $1 AND emergency_type = $2 AND status = $3`,
      [reporterId, type, status]
    );
    if (rows[0]) return rows[0];
    const inserted = await pool.query(
      `INSERT INTO emergencies
        (reporter_id, boat_id, trip_id, emergency_type, description, latitude, longitude, location_accuracy, priority, status, assigned_responder_id, is_demo, acknowledged_at, assigned_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,TRUE,
         CASE WHEN $12::text IN ('ACKNOWLEDGED','RESPONDER_ASSIGNED','RESPONSE_IN_PROGRESS','ARRIVED','RESOLVED') THEN now() ELSE NULL END,
         CASE WHEN $12::text IN ('RESPONDER_ASSIGNED','RESPONSE_IN_PROGRESS','ARRIVED','RESOLVED') THEN now() ELSE NULL END)
       RETURNING id`,
      [reporterId, boatId, tripIdArg, type, 'Seeded demo emergency for class presentation.', lat, lng, 6, priorityForType(type), status, responderId, status]
    );
    return inserted.rows[0];
  }
  

  function priorityForType(type) {
    const critical = ['BOAT_CAPSIZING', 'PERSON_OVERBOARD', 'FIRE', 'MEDICAL_EMERGENCY', 'COLLISION', 'BOAT_SINKING'];
    const high = ['ENGINE_FAILURE', 'BAD_WEATHER', 'MISSING_BOAT_PERSON', 'SECURITY_THREAT'];
    if (critical.includes(type)) return 'CRITICAL';
    if (high.includes(type)) return 'HIGH';
    return 'NORMAL';
  }

  const responderRow1 = await pool.query('SELECT id FROM responders WHERE user_id = $1', [responderUser1.id]);
  const responderRow2 = await pool.query('SELECT id FROM responders WHERE user_id = $1', [responderUser2.id]);

  await upsertEmergency('BOAT_CAPSIZING', 'NEW', 'CRITICAL', 7.2130, -0.1745, passenger.id, boat1.id, tripId, null);
  await upsertEmergency('ENGINE_FAILURE', 'RESPONDER_ASSIGNED', 'HIGH', 7.1980, -0.1620, operator2.id, boat2.id, null, responderRow1.rows[0]?.id);
  await upsertEmergency('MEDICAL_EMERGENCY', 'RESPONSE_IN_PROGRESS', 'CRITICAL', 7.2260, -0.1900, passenger.id, boat1.id, null, responderRow2.rows[0]?.id);
  await upsertEmergency('BAD_WEATHER', 'ACKNOWLEDGED', 'HIGH', 7.2050, -0.1550, operator1.id, boat1.id, null, null);

  console.log('\n=================================================');
  console.log(' SEED COMPLETE — demo login credentials');
  console.log('=================================================');
  console.log(` Admin:         +233240000001 / ${DEMO_PASSWORD}`);
  console.log(` Passenger:     +233240000002 / ${DEMO_PASSWORD}`);
  console.log(` Boat Operator: +233240000003 / ${DEMO_PASSWORD}`);
  console.log(` Boat Operator: +233240000004 / ${DEMO_PASSWORD}`);
  console.log(` Responder:     +233240000005 / ${DEMO_PASSWORD}`);
  console.log(` Responder:     +233240000006 / ${DEMO_PASSWORD}`);
  console.log('=================================================\n');

  await pool.end();
}

main().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
