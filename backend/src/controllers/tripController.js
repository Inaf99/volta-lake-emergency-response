const asyncHandler = require('../utils/asyncHandler');
const tripModel = require('../models/tripModel');
const locationHistoryModel = require('../models/locationHistoryModel');

const startTrip = asyncHandler(async (req, res) => {
  const { boat_id, departure_location, destination, current_latitude, current_longitude } = req.body;
  if (!boat_id) return res.status(400).json({ error: 'boat_id is required.' });

  const trip = await tripModel.startTrip({
    boat_id, operator_id: req.user.id, departure_location, destination,
    current_latitude, current_longitude,
  });
  res.status(201).json({ trip });
});

const endTrip = asyncHandler(async (req, res) => {
  const trip = await tripModel.endTrip(req.params.id);
  if (!trip) return res.status(404).json({ error: 'Trip not found.' });
  res.json({ trip });
});

const updateLocation = asyncHandler(async (req, res) => {
  const { latitude, longitude, accuracy } = req.body;
  if (latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: 'latitude and longitude are required.' });
  }
  const trip = await tripModel.updateLocation(req.params.id, latitude, longitude);
  if (!trip) return res.status(404).json({ error: 'Trip not found.' });

  await locationHistoryModel.record({
    user_id: req.user.id, boat_id: trip.boat_id, latitude, longitude, accuracy,
  });

  res.json({ trip });
});

const myActiveTrip = asyncHandler(async (req, res) => {
  const trip = await tripModel.findActiveByOperator(req.user.id);
  res.json({ trip });
});

const listTrips = asyncHandler(async (req, res) => {
  const trips = await tripModel.listAll();
  res.json({ trips });
});

module.exports = { startTrip, endTrip, updateLocation, myActiveTrip, listTrips };
