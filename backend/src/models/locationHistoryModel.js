const { pool } = require('../config/db');

async function record({ user_id, boat_id, latitude, longitude, accuracy }) {
  const { rows } = await pool.query(
    `INSERT INTO location_history (user_id, boat_id, latitude, longitude, accuracy)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [user_id || null, boat_id || null, latitude, longitude, accuracy || null]
  );
  return rows[0];
}

async function listForBoat(boatId, limit = 100) {
  const { rows } = await pool.query(
    `SELECT * FROM location_history WHERE boat_id = $1 ORDER BY recorded_at DESC LIMIT $2`,
    [boatId, limit]
  );
  return rows;
}

module.exports = { record, listForBoat };
