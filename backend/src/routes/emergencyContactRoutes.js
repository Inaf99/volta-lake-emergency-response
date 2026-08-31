const express = require('express');
const router = express.Router();
const contactController = require('../controllers/emergencyContactController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.get('/', requireAuth, contactController.listContacts);
router.post('/', requireAuth, requireRole('ADMIN'), contactController.createContact);
router.put('/:id', requireAuth, requireRole('ADMIN'), contactController.updateContact);
router.patch('/:id/active', requireAuth, requireRole('ADMIN'), contactController.setActive);
router.delete('/:id', requireAuth, requireRole('ADMIN'), contactController.deleteContact);

module.exports = router;
