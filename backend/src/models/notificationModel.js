const { pool } = require('../config/db');

async function create({ recipient_id, emergency_id, notification_type, message, status }) {
  const { rows } = await pool.query(
    `INSERT INTO notifications (recipient_id, emergency_id, notification_type, message, status)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [recipient_id || null, emergency_id || null, notification_type || 'EMERGENCY_ALERT', message, status || 'DELIVERED']
  );
  return rows[0];
}

async function listByRecipient(recipientId) {
  const { rows } = await pool.query(
    `SELECT * FROM notifications WHERE recipient_id = $1 ORDER BY created_at DESC LIMIT 50`,
    [recipientId]
  );
  return rows;
}

async function listByEmergency(emergencyId) {
  const { rows } = await pool.query(
    `SELECT * FROM notifications WHERE emergency_id = $1 ORDER BY created_at DESC`,
    [emergencyId]
  );
  return rows;
}

module.exports = { create, listByRecipient, listByEmergency };
