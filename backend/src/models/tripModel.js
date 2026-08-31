const { pool } = require('../config/db');

async function startTrip({ boat_id, operator_id, departure_location, destination, current_latitude, current_longitude }) {
  const { rows } = await pool.query(
    `INSERT INTO trips (boat_id, operator_id, departure_location, destination, current_latitude, current_longitude, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE') RETURNING *`,
    [boat_id, operator_id, departure_location || null, destination || null, current_latitude || null, current_longitude || null]
  );
  return rows[0];
}

async function endTrip(id) {
  const { rows } = await pool.query(
    `UPDATE trips SET status = 'COMPLETED', end_time = now() WHERE id = $1 RETURNING *`,
    [id]
  );
  return rows[0] || null;
}

async function updateLocation(id, latitude, longitude) {
  const { rows } = await pool.query(
    `UPDATE trips SET current_latitude = $2, current_longitude = $3 WHERE id = $1 RETURNING *`,
    [id, latitude, longitude]
  );
  return rows[0] || null;
}

async function findActiveByOperator(operatorId) {
  const { rows } = await pool.query(
    `SELECT t.*, b.boat_name, b.registration_number
     FROM trips t JOIN boats b ON b.id = t.boat_id
     WHERE t.operator_id = $1 AND t.status = 'ACTIVE'
     ORDER BY t.start_time DESC LIMIT 1`,
    [operatorId]
  );
  return rows[0] || null;
}

async function findById(id) {
  const { rows } = await pool.query(`SELECT * FROM trips WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function listAll() {
  const { rows } = await pool.query(
    `SELECT t.*, b.boat_name, b.registration_number, u.full_name AS operator_name
     FROM trips t
     JOIN boats b ON b.id = t.boat_id
     JOIN users u ON u.id = t.operator_id
     ORDER BY t.start_time DESC`
  );
  return rows;
}

module.exports = { startTrip, endTrip, updateLocation, findActiveByOperator, findById, listAll };
