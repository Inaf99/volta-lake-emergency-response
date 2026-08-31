// NOTIFICATION SERVICE — sits between the emergency controller and the
// lower-level channels (in-app notifications table + SMS service).
// This is the "Notify relevant responders" and "Send SMS to active
// emergency contacts" step of the SOS workflow.
const notificationModel = require('../models/notificationModel');
const emergencyContactModel = require('../models/emergencyContactModel');
const responderModel = require('../models/responderModel');
const smsService = require('./smsService');
const buildMapLink = require('../utils/buildMapLink');

function formatTime(date) {
  return new Date(date).toISOString().slice(11, 16) + ' UTC';
}

function buildSmsMessage(emergency) {
  const mapLink = buildMapLink(emergency.latitude, emergency.longitude);
  return [
    'EMERGENCY ALERT - VOLTA LAKE',
    '',
    `Type: ${emergency.emergency_type.replace(/_/g, ' ')}`,
    `Reporter: ${emergency.reporter_name || 'Unknown'}`,
    `Boat: ${emergency.registration_number || 'N/A'}`,
    `Location: ${emergency.latitude.toFixed(4)}, ${emergency.longitude.toFixed(4)}`,
    `Time: ${formatTime(emergency.created_at)}`,
    '',
    `Map: ${mapLink}`,
    '',
    'Please respond immediately.',
  ].join('\n');
}

/**
 * Runs the full notification fan-out for a newly created emergency:
 *  1. in-app notification rows for admins/responders
 *  2. SMS to every active emergency contact
 */
async function notifyNewEmergency(emergency) {
  const inAppMessage = `New ${emergency.priority} emergency (${emergency.emergency_type.replace(/_/g, ' ')}) reported near ${emergency.latitude.toFixed(3)}, ${emergency.longitude.toFixed(3)}.`;

  await notificationModel.create({
    recipient_id: null, // broadcast to the admin/responder dashboard, not one user
    emergency_id: emergency.id,
    notification_type: 'EMERGENCY_ALERT',
    message: inAppMessage,
    status: 'DELIVERED',
  });

  const activeContacts = await emergencyContactModel.listAll({ activeOnly: true });
  const message = buildSmsMessage(emergency);
  const smsLogs = await smsService.sendEmergencySMS({ emergency, contacts: activeContacts, message });

  return { inAppMessage, smsLogs, contactsNotified: activeContacts.length };
}

async function notifyStatusChange(emergency, newStatus) {
  const message = `Emergency ${emergency.id.slice(0, 8)} is now ${newStatus.replace(/_/g, ' ')}.`;
  await notificationModel.create({
    recipient_id: emergency.reporter_id,
    emergency_id: emergency.id,
    notification_type: 'STATUS_UPDATE',
    message,
    status: 'DELIVERED',
  });
  return message;
}

module.exports = { notifyNewEmergency, notifyStatusChange, buildSmsMessage };
