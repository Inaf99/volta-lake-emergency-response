const { pool } = require('../config/db');

const STATUS_FLOW = ['NEW', 'ACKNOWLEDGED', 'RESPONDER_ASSIGNED', 'RESPONSE_IN_PROGRESS', 'ARRIVED', 'RESOLVED'];

async function createEmergency({
  reporter_id, boat_id, trip_id, emergency_type, description,
  latitude, longitude, location_accuracy, priority, is_demo,
}) {
  const { rows } = await pool.query(
    `INSERT INTO emergencies
       (reporter_id, boat_id, trip_id, emergency_type, description, latitude, longitude, location_accuracy, priority, status, is_demo)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'NEW',$10)
     RETURNING *`,
    [reporter_id, boat_id || null, trip_id || null, emergency_type, description || null,
      latitude, longitude, location_accuracy || null, priority, !!is_demo]
  );
  return rows[0];
}

async function listAll({ status, priority } = {}) {
  const conditions = [];
  const values = [];
  if (status) { values.push(status); conditions.push(`e.status = $${values.length}`); }
  if (priority) { values.push(priority); conditions.push(`e.priority = $${values.length}`); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await pool.query(
    `SELECT e.*, u.full_name AS reporter_name, u.phone AS reporter_phone,
            b.boat_name, b.registration_number,
            r.id AS responder_id, ru.full_name AS responder_name
     FROM emergencies e
     JOIN users u ON u.id = e.reporter_id
     LEFT JOIN boats b ON b.id = e.boat_id
     LEFT JOIN responders r ON r.id = e.assigned_responder_id
     LEFT JOIN users ru ON ru.id = r.user_id
     ${where}
     ORDER BY
       CASE e.priority WHEN 'CRITICAL' THEN 0 WHEN 'HIGH' THEN 1 ELSE 2 END,
       e.created_at DESC`,
    values
  );
  return rows;
}

async function findById(id) {
  const { rows } = await pool.query(
    `SELECT e.*, u.full_name AS reporter_name, u.phone AS reporter_phone,
            b.boat_name, b.registration_number,
            r.id AS responder_id, ru.full_name AS responder_name, ru.phone AS responder_phone
     FROM emergencies e
     JOIN users u ON u.id = e.reporter_id
     LEFT JOIN boats b ON b.id = e.boat_id
     LEFT JOIN responders r ON r.id = e.assigned_responder_id
     LEFT JOIN users ru ON ru.id = r.user_id
     WHERE e.id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function listByReporter(reporterId) {
  const { rows } = await pool.query(
    `SELECT * FROM emergencies WHERE reporter_id = $1 ORDER BY created_at DESC`,
    [reporterId]
  );
  return rows;
}

async function updateStatus(id, status) {
  const timestampColumn = {
    ACKNOWLEDGED: 'acknowledged_at',
    RESPONDER_ASSIGNED: 'assigned_at',
    ARRIVED: 'arrived_at',
    RESOLVED: 'resolved_at',
    CANCELLED: 'cancelled_at',
  }[status];

  const setTimestamp = timestampColumn ? `, ${timestampColumn} = now()` : '';

  const { rows } = await pool.query(
    `UPDATE emergencies SET status = $2 ${setTimestamp} WHERE id = $1 RETURNING *`,
    [id, status]
  );
  return rows[0] || null;
}

async function assignResponder(id, responderId) {
  const { rows } = await pool.query(
    `UPDATE emergencies SET assigned_responder_id = $2, status = 'RESPONDER_ASSIGNED', assigned_at = now()
     WHERE id = $1 RETURNING *`,
    [id, responderId]
  );
  return rows[0] || null;
}

async function stats() {
  const { rows } = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE status NOT IN ('RESOLVED','CANCELLED')) AS active_emergencies,
      COUNT(*) FILTER (WHERE status NOT IN ('RESOLVED','CANCELLED') AND priority = 'CRITICAL') AS critical_emergencies,
      COUNT(*) FILTER (WHERE status = 'NEW') AS new_alerts,
      COUNT(*) FILTER (WHERE status = 'ACKNOWLEDGED') AS acknowledged_alerts,
      COUNT(*) FILTER (WHERE status = 'RESOLVED') AS resolved_incidents,
      COUNT(*) FILTER (WHERE status = 'CANCELLED') AS cancelled_alerts
    FROM emergencies
  `);
  return rows[0];
}

module.exports = {
  STATUS_FLOW, createEmergency, listAll, findById, listByReporter,
  updateStatus, assignResponder, stats,
};
