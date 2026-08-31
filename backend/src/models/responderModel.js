const { pool } = require('../config/db');

async function createResponder({ user_id, responder_type, current_latitude, current_longitude }) {
  const { rows } = await pool.query(
    `INSERT INTO responders (user_id, responder_type, current_latitude, current_longitude)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [user_id, responder_type || 'MARINE_RESCUE', current_latitude || null, current_longitude || null]
  );
  return rows[0];
}

async function listAll() {
  const { rows } = await pool.query(
    `SELECT r.*, u.full_name, u.phone
     FROM responders r JOIN users u ON u.id = r.user_id
     ORDER BY r.availability_status ASC, u.full_name ASC`
  );
  return rows;
}

async function findByUserId(userId) {
  const { rows } = await pool.query(`SELECT * FROM responders WHERE user_id = $1`, [userId]);
  return rows[0] || null;
}

async function findById(id) {
  const { rows } = await pool.query(
    `SELECT r.*, u.full_name, u.phone FROM responders r JOIN users u ON u.id = r.user_id WHERE r.id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function updateStatusAndLocation(id, { availability_status, current_latitude, current_longitude }) {
  const { rows } = await pool.query(
    `UPDATE responders SET
       availability_status = COALESCE($2, availability_status),
       current_latitude = COALESCE($3, current_latitude),
       current_longitude = COALESCE($4, current_longitude)
     WHERE id = $1 RETURNING *`,
    [id, availability_status, current_latitude, current_longitude]
  );
  return rows[0] || null;
}

async function findNearestAvailable(lat, lng) {
  // Simple planar distance is fine at Volta Lake's scale for a class project;
  // a real system would use PostGIS / haversine.
  const { rows } = await pool.query(
    `SELECT r.*, u.full_name, u.phone,
       ((r.current_latitude - $1)^2 + (r.current_longitude - $2)^2) AS dist_sq
     FROM responders r JOIN users u ON u.id = r.user_id
     WHERE r.availability_status = 'AVAILABLE'
       AND r.current_latitude IS NOT NULL
     ORDER BY dist_sq ASC
     LIMIT 1`,
    [lat, lng]
  );
  return rows[0] || null;
}

module.exports = { createResponder, listAll, findByUserId, findById, updateStatusAndLocation, findNearestAvailable };
