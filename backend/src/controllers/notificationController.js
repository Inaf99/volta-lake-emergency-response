const asyncHandler = require('../utils/asyncHandler');
const emergencyModel = require('../models/emergencyModel');
const notificationService = require('../services/notificationService');

// POST /api/notifications/emergency — manually re-trigger notifications
// for an emergency (useful for the class demo, e.g. "resend SMS").
const resendEmergencyNotification = asyncHandler(async (req, res) => {
  const { emergency_id } = req.body;
  if (!emergency_id) return res.status(400).json({ error: 'emergency_id is required.' });

  const emergency = await emergencyModel.findById(emergency_id);
  if (!emergency) return res.status(404).json({ error: 'Emergency not found.' });

  const result = await notificationService.notifyNewEmergency(emergency);
  res.json({ notified_contacts: result.contactsNotified, sms_logs: result.smsLogs });
});

module.exports = { resendEmergencyNotification };
