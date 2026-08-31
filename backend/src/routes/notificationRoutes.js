const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.post('/emergency', requireAuth, requireRole('ADMIN', 'RESPONDER'), notificationController.resendEmergencyNotification);

module.exports = router;
