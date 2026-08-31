// SMS SERVICE — the only file in the app that knows which provider is
// active. Controllers never talk to Twilio (or any provider) directly:
//
//   Emergency Controller -> Notification Service -> SMS Service -> SMS Provider
//
// This means a new provider (e.g. Africa's Talking, Hubtel) can be added
// by dropping a new file in services/sms/ and adding one line below —
// nothing else in the app changes.
const env = require('../config/env');
const demoProvider = require('./sms/demoProvider');
const twilioProvider = require('./sms/twilioProvider');
const smsLogModel = require('../models/smsLogModel');

const PROVIDERS = {
  demo: demoProvider,
  twilio: twilioProvider,
};

function getActiveProvider() {
  return PROVIDERS[env.smsProvider] || demoProvider;
}

/**
 * Sends a single SMS and records the attempt in sms_logs regardless of
 * outcome, so the admin dashboard always shows what was attempted.
 */
async function sendSMS({ to, message, emergencyId = null, contactId = null }) {
  const provider = getActiveProvider();

  try {
    const result = await provider.send({ to, message });
    return smsLogModel.create({
      emergency_id: emergencyId,
      contact_id: contactId,
      recipient_phone: to,
      message,
      provider: env.smsProvider,
      status: result.status, // SENT (twilio) or SIMULATED (demo)
      sent_at: new Date(),
    });
  } catch (err) {
    // Never let an SMS failure crash the emergency workflow.
    return smsLogModel.create({
      emergency_id: emergencyId,
      contact_id: contactId,
      recipient_phone: to,
      message,
      provider: env.smsProvider,
      status: 'FAILED',
      error_message: err.message,
    });
  }
}

/**
 * Sends the same emergency alert message to every given active contact.
 * Returns the array of sms_logs rows created (one per recipient).
 */
async function sendEmergencySMS({ emergency, contacts, message }) {
  const results = [];
  for (const contact of contacts) {
    // eslint-disable-next-line no-await-in-loop
    const log = await sendSMS({
      to: contact.phone,
      message,
      emergencyId: emergency.id,
      contactId: contact.id,
    });
    results.push(log);
  }
  return results;
}

async function getSMSStatus(emergencyId) {
  return smsLogModel.listByEmergency(emergencyId);
}

module.exports = { sendSMS, sendEmergencySMS, getSMSStatus, getActiveProvider };
