const asyncHandler = require('../utils/asyncHandler');
const boatModel = require('../models/boatModel');

const createBoat = asyncHandler(async (req, res) => {
  const { boat_name, registration_number, boat_type, passenger_capacity } = req.body;
  if (!boat_name || !registration_number) {
    return res.status(400).json({ error: 'boat_name and registration_number are required.' });
  }
  const boat = await boatModel.createBoat({
    operator_id: req.user.id, boat_name, registration_number, boat_type, passenger_capacity,
  });
  res.status(201).json({ boat });
});

const listBoats = asyncHandler(async (req, res) => {
  const boats = req.user.role === 'ADMIN'
    ? await boatModel.listAll()
    : await boatModel.listByOperator(req.user.id);
  res.json({ boats });
});

const updateBoat = asyncHandler(async (req, res) => {
  const boat = await boatModel.findById(req.params.id);
  if (!boat) return res.status(404).json({ error: 'Boat not found.' });
  if (req.user.role !== 'ADMIN' && boat.operator_id !== req.user.id) {
    return res.status(403).json({ error: 'You can only edit your own boats.' });
  }
  const updated = await boatModel.updateBoat(req.params.id, req.body);
  res.json({ boat: updated });
});

const deleteBoat = asyncHandler(async (req, res) => {
  const boat = await boatModel.findById(req.params.id);
  if (!boat) return res.status(404).json({ error: 'Boat not found.' });
  if (req.user.role !== 'ADMIN' && boat.operator_id !== req.user.id) {
    return res.status(403).json({ error: 'You can only delete your own boats.' });
  }
  await boatModel.deleteBoat(req.params.id);
  res.json({ success: true });
});

module.exports = { createBoat, listBoats, updateBoat, deleteBoat };
