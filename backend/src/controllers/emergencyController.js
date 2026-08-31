const asyncHandler = require('../utils/asyncHandler');
const emergencyModel = require('../models/emergencyModel');
const tripModel = require('../models/tripModel');
const responderModel = require('../models/responderModel');
const locationHistoryModel = require('../models/locationHistoryModel');
const auditLogModel = require('../models/auditLogModel');
const notificationService = require('../services/notificationService');
const { priorityForType } = require('../utils/emergencyPriority');

// POST /api/emergencies  — the core "press SOS" endpoint.
const createEmergency = asyncHandler(async (req, res) => {
  const {
    boat_id, trip_id, emergency_type, description,
    latitude, longitude, location_accuracy, is_demo,
  } = req.body;

  if (!emergency_type || latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: 'emergency_type, latitude and longitude are required.' });
  }

  const priority = priorityForType(emergency_type);

  const emergency = await emergencyModel.createEmergency({
    reporter_id: req.user.id,
    boat_id, trip_id, emergency_type, description,
    latitude, longitude, location_accuracy, priority, is_demo,
  });

  // Log the GPS point into location history too, so a trail exists.
  await locationHistoryModel.record({
    user_id: req.user.id, boat_id, latitude, longitude, accuracy: location_accuracy,
  });

  if (trip_id) {
    await tripModel.updateLocation(trip_id, latitude, longitude).catch(() => null);
  }

  const full = await emergencyModel.findById(emergency.id);
  const notifyResult = await notificationService.notifyNewEmergency(full);

  await auditLogModel.record({
    actor_id: req.user.id,
    action: 'EMERGENCY_CREATED',
    entity_type: 'emergency',
    entity_id: emergency.id,
    details: { emergency_type, priority },
  });

  res.status(201).json({
    emergency: full,
    notified_contacts: notifyResult.contactsNotified,
    sms_logs: notifyResult.smsLogs,
  });
});

// GET /api/emergencies?status=&priority=
const listEmergencies = asyncHandler(async (req, res) => {
  const { status, priority } = req.query;
  const emergencies = await emergencyModel.listAll({ status, priority });
  res.json({ emergencies });
});

// GET /api/emergencies/mine  — for a passenger/operator's own history
const listMine = asyncHandler(async (req, res) => {
  const emergencies = await emergencyModel.listByReporter(req.user.id);
  res.json({ emergencies });
});

// GET /api/emergencies/:id
const getEmergency = asyncHandler(async (req, res) => {
  const emergency = await emergencyModel.findById(req.params.id);
  if (!emergency) return res.status(404).json({ error: 'Emergency not found.' });
  res.json({ emergency });
});

// PATCH /api/emergencies/:id/status   body: { status }
const updateStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const allowed = [...emergencyModel.STATUS_FLOW, 'CANCELLED'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${allowed.join(', ')}` });
  }

  const existing = await emergencyModel.findById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Emergency not found.' });

  const updated = await emergencyModel.updateStatus(req.params.id, status);
  await notificationService.notifyStatusChange(updated, status);
  await auditLogModel.record({
    actor_id: req.user.id,
    action: 'EMERGENCY_STATUS_CHANGED',
    entity_type: 'emergency',
    entity_id: updated.id,
    details: { from: existing.status, to: status },
  });

  res.json({ emergency: updated });
});

// PATCH /api/emergencies/:id/assign   body: { responder_id }  (optional — auto-assigns nearest if omitted)
const assignResponder = asyncHandler(async (req, res) => {
  const emergency = await emergencyModel.findById(req.params.id);
  if (!emergency) return res.status(404).json({ error: 'Emergency not found.' });

  let responderId = req.body.responder_id;
  if (!responderId) {
    const nearest = await responderModel.findNearestAvailable(emergency.latitude, emergency.longitude);
    if (!nearest) return res.status(409).json({ error: 'No available responders to assign.' });
    responderId = nearest.id;
  }

  const updated = await emergencyModel.assignResponder(req.params.id, responderId);
  await responderModel.updateStatusAndLocation(responderId, { availability_status: 'BUSY' });
  await notificationService.notifyStatusChange(updated, 'RESPONDER_ASSIGNED');
  await auditLogModel.record({
    actor_id: req.user.id,
    action: 'RESPONDER_ASSIGNED',
    entity_type: 'emergency',
    entity_id: updated.id,
    details: { responder_id: responderId },
  });

  res.json({ emergency: updated });
});

// GET /api/emergencies/stats/summary
const getStats = asyncHandler(async (req, res) => {
  const stats = await emergencyModel.stats();
  res.json({ stats });
});

module.exports = {
  createEmergency, listEmergencies, listMine, getEmergency,
  updateStatus, assignResponder, getStats,
};
