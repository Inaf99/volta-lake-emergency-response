const express = require('express');
const router = express.Router();
const emergencyController = require('../controllers/emergencyController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.post('/', requireAuth, emergencyController.createEmergency);
router.get('/', requireAuth, requireRole('ADMIN', 'RESPONDER'), emergencyController.listEmergencies);
router.get('/mine', requireAuth, emergencyController.listMine);
router.get('/stats/summary', requireAuth, requireRole('ADMIN', 'RESPONDER'), emergencyController.getStats);
router.get('/:id', requireAuth, emergencyController.getEmergency);
router.patch('/:id/status', requireAuth, requireRole('ADMIN', 'RESPONDER'), emergencyController.updateStatus);
router.patch('/:id/assign', requireAuth, requireRole('ADMIN', 'RESPONDER'), emergencyController.assignResponder);

module.exports = router;
