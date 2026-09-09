const express = require('express');
const router = express.Router();
const offlineController = require('../controllers/offlineController');
const { requireAuth } = require('../middleware/auth');

// Any authenticated role can fetch this — it's what the frontend caches
// client-side for the offline SMS fallback.
router.get('/', requireAuth, offlineController.getOfflineContacts);

module.exports = router;
