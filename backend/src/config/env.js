// Central place that reads process.env once, with sane fallbacks,
// so the rest of the app never touches process.env directly.
require('dotenv').config();

module.exports = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',

  databaseUrl: process.env.DATABASE_URL,

  jwtSecret: process.env.JWT_SECRET || 'dev_only_insecure_secret_change_me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  smsProvider: (process.env.SMS_PROVIDER || 'demo').toLowerCase(),
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    phoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
  },

  mapUrlTemplate:
    process.env.MAP_PROVIDER ||
    'https://www.openstreetmap.org/?mlat={lat}&mlon={lng}#map=16/{lat}/{lng}',
};
