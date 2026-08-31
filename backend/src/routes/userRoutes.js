const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.get('/', requireAuth, requireRole('ADMIN'), userController.listUsers);
router.patch('/me', requireAuth, userController.updateMyProfile);

module.exports = router;
