const express = require('express');
const router = express.Router();
const smsLogController = require('../controllers/smsLogController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.get('/', requireAuth, requireRole('ADMIN'), smsLogController.listSmsLogs);

module.exports = router;
