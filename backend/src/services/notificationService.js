// NOTIFICATION SERVICE — sits between the emergency controller and the
// lower-level channels (in-app notifications table + SMS service).
// This is the "Notify relevant responders" and "Send SMS to active
// emergency contacts" step of the SOS workflow.
const notificationModel = require('../models/notificationModel');
const emergencyContactModel = require('../models/emergencyContactModel');
const responderModel = require('../models/responderModel');
const userModel = require('../models/userModel');
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
 *  3. SMS + in-app notification straight to the nearest available responder
 *     ("the designated responder") — fires immediately on creation, before
 *     anyone has manually assigned or acknowledged anything
 *  4. SMS + in-app notification to every admin account
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

  // Immediately notify the nearest available responder — the "designated
  // responder" for this emergency — even though no one has formally
  // assigned them yet. This is deliberately separate from
  // notifyResponderAssigned(), which fires later once an admin/responder
  // actually accepts the assignment.
  let responderNotified = false;
  const nearestResponder = await responderModel.findNearestAvailable(emergency.latitude, emergency.longitude);
  if (nearestResponder?.phone) {
    const responderLog = await smsService.sendSMS({
      to: nearestResponder.phone, message, emergencyId: emergency.id, contactId: null,
    });
    smsLogs.push(responderLog);
    await notificationModel.create({
      recipient_id: nearestResponder.user_id,
      emergency_id: emergency.id,
      notification_type: 'EMERGENCY_ALERT',
      message: inAppMessage,
      status: 'DELIVERED',
    });
    responderNotified = true;
  }

  // Immediately notify every admin account, so the system administrator
  // never depends on being logged into the dashboard at the right moment.
  const admins = await userModel.listByRole('ADMIN');
  let adminsNotified = 0;
  for (const admin of admins) {
    if (!admin.phone) continue;
    const adminLog = await smsService.sendSMS({
      to: admin.phone, message, emergencyId: emergency.id, contactId: null,
    });
    smsLogs.push(adminLog);
    await notificationModel.create({
      recipient_id: admin.id,
      emergency_id: emergency.id,
      notification_type: 'EMERGENCY_ALERT',
      message: inAppMessage,
      status: 'DELIVERED',
    });
    adminsNotified += 1;
  }

  return {
    inAppMessage, smsLogs, contactsNotified: activeContacts.length,
    responderNotified, adminsNotified,
  };
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

/**
 * Texts the responder directly the moment they're assigned to an
 * emergency — separate from the emergency-contacts fan-out in
 * notifyNewEmergency(). Uses the same smsService/provider pipeline, so it
 * honours SMS_PROVIDER=demo vs twilio exactly like every other SMS.
 */
async function notifyResponderAssigned(emergency, responder) {
  const mapLink = buildMapLink(emergency.latitude, emergency.longitude);
  const message = [
    'VOLTA LAKE — YOU HAVE BEEN ASSIGNED',
    '',
    `Type: ${emergency.emergency_type.replace(/_/g, ' ')}`,
    `Priority: ${emergency.priority}`,
    `Location: ${emergency.latitude.toFixed(4)}, ${emergency.longitude.toFixed(4)}`,
    '',
    `Map: ${mapLink}`,
    '',
    'Please acknowledge and respond.',
  ].join('\n');

  return smsService.sendSMS({
    to: responder.phone,
    message,
    emergencyId: emergency.id,
    contactId: null,
  });
}

module.exports = { notifyNewEmergency, notifyStatusChange, notifyResponderAssigned, buildSmsMessage };
