const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const env = require('./config/env');
const { testConnection } = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const emergencyRoutes = require('./routes/emergencyRoutes');
const boatRoutes = require('./routes/boatRoutes');
const tripRoutes = require('./routes/tripRoutes');
const emergencyContactRoutes = require('./routes/emergencyContactRoutes');
const responderRoutes = require('./routes/responderRoutes');
const smsLogRoutes = require('./routes/smsLogRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();

app.use(cors({ origin: env.frontendOrigin === '*' ? true : env.frontendOrigin }));
app.use(express.json());
app.use(morgan(env.nodeEnv === 'development' ? 'dev' : 'combined'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', smsProvider: env.smsProvider, nodeEnv: env.nodeEnv });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/emergencies', emergencyRoutes);
app.use('/api/boats', boatRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/emergency-contacts', emergencyContactRoutes);
app.use('/api/responders', responderRoutes);
app.use('/api/sms-logs', smsLogRoutes);
app.use('/api/notifications', notificationRoutes);

app.use(notFound);
app.use(errorHandler);

async function start() {
  await testConnection(); // logs a warning but does not crash if DB is down
  app.listen(env.port, () => {
    console.log(`\nVolta Lake Emergency Response API`);
    console.log(`  listening on http://localhost:${env.port}`);
    console.log(`  SMS provider: ${env.smsProvider.toUpperCase()}`);
    console.log(`  environment: ${env.nodeEnv}\n`);
  });
}

start();

module.exports = app;
