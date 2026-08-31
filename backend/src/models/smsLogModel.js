const { pool } = require('../config/db');

async function create({ emergency_id, contact_id, recipient_phone, message, provider, status, error_message, sent_at }) {
  const { rows } = await pool.query(
    `INSERT INTO sms_logs (emergency_id, contact_id, recipient_phone, message, provider, status, error_message, sent_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [emergency_id || null, contact_id || null, recipient_phone, message, provider, status, error_message || null, sent_at || null]
  );
  return rows[0];
}

async function listAll({ status } = {}) {
  const where = status ? `WHERE s.status = $1` : '';
  const values = status ? [status] : [];
  const { rows } = await pool.query(
    `SELECT s.*, e.emergency_type FROM sms_logs s
     LEFT JOIN emergencies e ON e.id = s.emergency_id
     ${where}
     ORDER BY s.created_at DESC`,
    values
  );
  return rows;
}

async function listByEmergency(emergencyId) {
  const { rows } = await pool.query(
    `SELECT * FROM sms_logs WHERE emergency_id = $1 ORDER BY created_at DESC`,
    [emergencyId]
  );
  return rows;
}

module.exports = { create, listAll, listByEmergency };
