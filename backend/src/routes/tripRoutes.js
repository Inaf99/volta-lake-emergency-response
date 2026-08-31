const express = require('express');
const router = express.Router();
const tripController = require('../controllers/tripController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.post('/', requireAuth, requireRole('BOAT_OPERATOR', 'ADMIN'), tripController.startTrip);
router.get('/', requireAuth, requireRole('ADMIN', 'RESPONDER'), tripController.listTrips);
router.get('/active/mine', requireAuth, requireRole('BOAT_OPERATOR', 'ADMIN'), tripController.myActiveTrip);
router.patch('/:id/end', requireAuth, requireRole('BOAT_OPERATOR', 'ADMIN'), tripController.endTrip);
router.patch('/:id/location', requireAuth, tripController.updateLocation);

module.exports = router;
