const { pool } = require('../config/db');

async function listAll({ activeOnly = false } = {}) {
  const where = activeOnly ? 'WHERE is_active = TRUE' : '';
  const { rows } = await pool.query(
    `SELECT * FROM emergency_contacts ${where} ORDER BY priority ASC, name ASC`
  );
  return rows;
}

async function findById(id) {
  const { rows } = await pool.query(`SELECT * FROM emergency_contacts WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function create({ name, organization, phone, contact_type, description, priority, is_active }) {
  const { rows } = await pool.query(
    `INSERT INTO emergency_contacts (name, organization, phone, contact_type, description, priority, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [name, organization || null, phone, contact_type, description || null, priority ?? 1, is_active ?? true]
  );
  return rows[0];
}

async function update(id, fields) {
  const { name, organization, phone, contact_type, description, priority, is_active } = fields;
  const { rows } = await pool.query(
    `UPDATE emergency_contacts SET
       name = COALESCE($2, name),
       organization = COALESCE($3, organization),
       phone = COALESCE($4, phone),
       contact_type = COALESCE($5, contact_type),
       description = COALESCE($6, description),
       priority = COALESCE($7, priority),
       is_active = COALESCE($8, is_active)
     WHERE id = $1 RETURNING *`,
    [id, name, organization, phone, contact_type, description, priority, is_active]
  );
  return rows[0] || null;
}

async function remove(id) {
  await pool.query(`DELETE FROM emergency_contacts WHERE id = $1`, [id]);
  return true;
}

async function setActive(id, isActive) {
  const { rows } = await pool.query(
    `UPDATE emergency_contacts SET is_active = $2 WHERE id = $1 RETURNING *`,
    [id, isActive]
  );
  return rows[0] || null;
}

module.exports = { listAll, findById, create, update, remove, setActive };
