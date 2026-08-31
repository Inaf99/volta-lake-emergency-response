// REAL SMS PROVIDER (Twilio)
// Only imported/used when SMS_PROVIDER=twilio. If credentials are missing
// this throws a clear error rather than a confusing Twilio SDK stack trace,
// and the caller (smsService.js) turns that into a FAILED log entry instead
// of crashing the request.
const env = require('../../config/env');

let twilioClient = null;
function getClient() {
  if (!twilioClient) {
    const twilio = require('twilio');
    twilioClient = twilio(env.twilio.accountSid, env.twilio.authToken);
  }
  return twilioClient;
}

async function send({ to, message }) {
  if (!env.twilio.accountSid || !env.twilio.authToken || !env.twilio.phoneNumber) {
    throw new Error('Twilio credentials are not configured (TWILIO_ACCOUNT_SID/AUTH_TOKEN/PHONE_NUMBER).');
  }

  const client = getClient();
  const result = await client.messages.create({
    to,
    from: env.twilio.phoneNumber,
    body: message,
  });

  return {
    status: 'SENT',
    providerMessageId: result.sid,
    errorMessage: null,
  };
}

module.exports = { send };
