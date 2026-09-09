const asyncHandler = require('../utils/asyncHandler');
const userModel = require('../models/userModel');
const responderModel = require('../models/responderModel');
const emergencyContactModel = require('../models/emergencyContactModel');

// GET /api/offline-contacts
//
// A small, cacheable payload of who to reach if the device loses internet
// mid-emergency. Any authenticated role can call this — the frontend fetches
// it opportunistically whenever it's online and stores it in localStorage,
// so the SOS flow still has phone numbers to fall back to even with zero
// connectivity at the moment of the emergency.
//
// Includes responder lat/lng so the client can run the same "nearest
// available responder" planar-distance pick the server does in
// responderModel.findNearestAvailable, entirely offline.
const getOfflineContacts = asyncHandler(async (req, res) => {
  const [admins, responders, contacts] = await Promise.all([
    userModel.listByRole('ADMIN'),
    responderModel.listAll(),
    emergencyContactModel.listAll({ activeOnly: true }),
  ]);

  res.json({
    generated_at: new Date().toISOString(),
    admins: admins
      .filter((a) => a.phone)
      .map((a) => ({ name: a.full_name, phone: a.phone })),
    responders: responders
      .filter((r) => r.phone)
      .map((r) => ({
        name: r.full_name,
        phone: r.phone,
        availability_status: r.availability_status,
        latitude: r.current_latitude,
        longitude: r.current_longitude,
      })),
    emergency_contacts: contacts
      .filter((c) => c.phone)
      .map((c) => ({ name: c.name, phone: c.phone, contact_type: c.contact_type })),
  });
});

module.exports = { getOfflineContacts };
