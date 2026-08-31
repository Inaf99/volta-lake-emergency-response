const bcrypt = require('bcryptjs');
const asyncHandler = require('../utils/asyncHandler');
const { signToken } = require('../utils/jwt');
const userModel = require('../models/userModel');
const responderModel = require('../models/responderModel');

const VALID_ROLES = ['PASSENGER', 'BOAT_OPERATOR', 'RESPONDER', 'ADMIN'];

const register = asyncHandler(async (req, res) => {
  const { full_name, phone, email, password, role, emergency_contact_name, emergency_contact_phone } = req.body;

  if (!full_name || !phone || !password) {
    return res.status(400).json({ error: 'full_name, phone and password are required.' });
  }
  const finalRole = VALID_ROLES.includes(role) ? role : 'PASSENGER';

  const existing = await userModel.findByPhone(phone);
  if (existing) {
    return res.status(409).json({ error: 'An account with this phone number already exists.' });
  }

  const password_hash = await bcrypt.hash(password, 10);
  const user = await userModel.createUser({
    full_name, phone, email, password_hash, role: finalRole,
    emergency_contact_name, emergency_contact_phone,
  });

  if (finalRole === 'RESPONDER') {
    await responderModel.createResponder({ user_id: user.id, responder_type: 'MARINE_RESCUE' });
  }

  const token = signToken({ id: user.id, role: finalRole, full_name: user.full_name });
  res.status(201).json({ user: { ...user, role: finalRole }, token });
});

const login = asyncHandler(async (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) {
    return res.status(400).json({ error: 'phone and password are required.' });
  }

  const user = await userModel.findByPhone(phone);
  if (!user || !user.is_active) {
    return res.status(401).json({ error: 'Invalid phone number or password.' });
  }

  const matches = await bcrypt.compare(password, user.password_hash);
  if (!matches) {
    return res.status(401).json({ error: 'Invalid phone number or password.' });
  }

  const token = signToken(user);
  const { password_hash, ...safeUser } = user;
  res.json({ user: safeUser, token });
});

const me = asyncHandler(async (req, res) => {
  const user = await userModel.findById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  res.json({ user });
});

module.exports = { register, login, me };
