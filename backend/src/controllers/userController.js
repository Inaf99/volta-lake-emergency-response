const asyncHandler = require('../utils/asyncHandler');
const userModel = require('../models/userModel');

// GET /api/users?role=PASSENGER  (admin only)
const listUsers = asyncHandler(async (req, res) => {
  const { role } = req.query;
  if (!role) return res.status(400).json({ error: 'Provide a ?role= query param.' });
  const users = await userModel.listByRole(role);
  res.json({ users });
});

const updateMyProfile = asyncHandler(async (req, res) => {
  const user = await userModel.updateProfile(req.user.id, req.body);
  res.json({ user });
});

module.exports = { listUsers, updateMyProfile };
