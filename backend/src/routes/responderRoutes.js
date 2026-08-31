const express = require('express');
const router = express.Router();
const responderController = require('../controllers/responderController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.get('/', requireAuth, requireRole('ADMIN', 'RESPONDER'), responderController.listResponders);
router.get('/me', requireAuth, requireRole('RESPONDER'), responderController.myResponderProfile);
router.patch('/:id', requireAuth, requireRole('ADMIN', 'RESPONDER'), responderController.updateResponder);

module.exports = router;
