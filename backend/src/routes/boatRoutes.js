const express = require('express');
const router = express.Router();
const boatController = require('../controllers/boatController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.post('/', requireAuth, requireRole('BOAT_OPERATOR', 'ADMIN'), boatController.createBoat);
router.get('/', requireAuth, boatController.listBoats);
router.put('/:id', requireAuth, requireRole('BOAT_OPERATOR', 'ADMIN'), boatController.updateBoat);
router.delete('/:id', requireAuth, requireRole('BOAT_OPERATOR', 'ADMIN'), boatController.deleteBoat);

module.exports = router;
