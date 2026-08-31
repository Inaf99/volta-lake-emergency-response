const { pool } = require('../config/db');

async function createUser({ full_name, phone, email, password_hash, role, emergency_contact_name, emergency_contact_phone }) {
  const { rows } = await pool.query(
    `INSERT INTO users (full_name, phone, email, password_hash, role, emergency_contact_name, emergency_contact_phone)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, full_name, phone, email, role, created_at`,
    [full_name, phone, email || null, password_hash, role, emergency_contact_name || null, emergency_contact_phone || null]
  );
  return rows[0];
}

async function findByPhone(phone) {
  const { rows } = await pool.query(`SELECT * FROM users WHERE phone = $1`, [phone]);
  return rows[0] || null;
}

async function findById(id) {
  const { rows } = await pool.query(
    `SELECT id, full_name, phone, email, role, emergency_contact_name, emergency_contact_phone,
            profile_photo_url, is_active, created_at
     FROM users WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function listByRole(role) {
  const { rows } = await pool.query(
    `SELECT id, full_name, phone, email, role, is_active, created_at
     FROM users WHERE role = $1 ORDER BY created_at DESC`,
    [role]
  );
  return rows;
}

async function updateProfile(id, { full_name, email, emergency_contact_name, emergency_contact_phone }) {
  const { rows } = await pool.query(
    `UPDATE users SET
       full_name = COALESCE($2, full_name),
       email = COALESCE($3, email),
       emergency_contact_name = COALESCE($4, emergency_contact_name),
       emergency_contact_phone = COALESCE($5, emergency_contact_phone)
     WHERE id = $1
     RETURNING id, full_name, phone, email, role, emergency_contact_name, emergency_contact_phone`,
    [id, full_name, email, emergency_contact_name, emergency_contact_phone]
  );
  return rows[0] || null;
}

module.exports = { createUser, findByPhone, findById, listByRole, updateProfile };
