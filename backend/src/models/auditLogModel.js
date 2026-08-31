const { pool } = require('../config/db');

async function record({ actor_id, action, entity_type, entity_id, details }) {
  const { rows } = await pool.query(
    `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [actor_id || null, action, entity_type, entity_id || null, details ? JSON.stringify(details) : null]
  );
  return rows[0];
}

async function listForEntity(entityType, entityId) {
  const { rows } = await pool.query(
    `SELECT * FROM audit_logs WHERE entity_type = $1 AND entity_id = $2 ORDER BY created_at DESC`,
    [entityType, entityId]
  );
  return rows;
}

module.exports = { record, listForEntity };
