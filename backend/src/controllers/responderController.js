const asyncHandler = require('../utils/asyncHandler');
const responderModel = require('../models/responderModel');

const listResponders = asyncHandler(async (req, res) => {
  const responders = await responderModel.listAll();
  res.json({ responders });
});

const updateResponder = asyncHandler(async (req, res) => {
  const { availability_status, current_latitude, current_longitude } = req.body;
  const responder = await responderModel.updateStatusAndLocation(req.params.id, {
    availability_status, current_latitude, current_longitude,
  });
  if (!responder) return res.status(404).json({ error: 'Responder not found.' });
  res.json({ responder });
});

const myResponderProfile = asyncHandler(async (req, res) => {
  const responder = await responderModel.findByUserId(req.user.id);
  res.json({ responder });
});

module.exports = { listResponders, updateResponder, myResponderProfile };
