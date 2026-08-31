const { pool } = require('../config/db');

async function createBoat({ operator_id, boat_name, registration_number, boat_type, passenger_capacity }) {
  const { rows } = await pool.query(
    `INSERT INTO boats (operator_id, boat_name, registration_number, boat_type, passenger_capacity)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [operator_id, boat_name, registration_number, boat_type || 'PASSENGER_BOAT', passenger_capacity || 0]
  );
  return rows[0];
}

async function listAll() {
  const { rows } = await pool.query(
    `SELECT b.*, u.full_name AS operator_name, u.phone AS operator_phone
     FROM boats b JOIN users u ON u.id = b.operator_id
     ORDER BY b.created_at DESC`
  );
  return rows;
}

async function listByOperator(operatorId) {
  const { rows } = await pool.query(
    `SELECT * FROM boats WHERE operator_id = $1 ORDER BY created_at DESC`,
    [operatorId]
  );
  return rows;
}

async function findById(id) {
  const { rows } = await pool.query(`SELECT * FROM boats WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function updateBoat(id, fields) {
  const { boat_name, registration_number, boat_type, passenger_capacity, status } = fields;
  const { rows } = await pool.query(
    `UPDATE boats SET
       boat_name = COALESCE($2, boat_name),
       registration_number = COALESCE($3, registration_number),
       boat_type = COALESCE($4, boat_type),
       passenger_capacity = COALESCE($5, passenger_capacity),
       status = COALESCE($6, status)
     WHERE id = $1 RETURNING *`,
    [id, boat_name, registration_number, boat_type, passenger_capacity, status]
  );
  return rows[0] || null;
}

async function deleteBoat(id) {
  await pool.query(`DELETE FROM boats WHERE id = $1`, [id]);
  return true;
}

module.exports = { createBoat, listAll, listByOperator, findById, updateBoat, deleteBoat };
