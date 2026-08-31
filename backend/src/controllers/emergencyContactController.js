const asyncHandler = require('../utils/asyncHandler');
const contactModel = require('../models/emergencyContactModel');
const auditLogModel = require('../models/auditLogModel');

const listContacts = asyncHandler(async (req, res) => {
  // Passengers/operators/responders only ever need to know contacts exist;
  // only admins manage them, but anyone authenticated can read the active list.
  const activeOnly = req.user.role !== 'ADMIN';
  const contacts = await contactModel.listAll({ activeOnly });
  res.json({ contacts });
});

const createContact = asyncHandler(async (req, res) => {
  const { name, phone, contact_type } = req.body;
  if (!name || !phone || !contact_type) {
    return res.status(400).json({ error: 'name, phone and contact_type are required.' });
  }
  const contact = await contactModel.create(req.body);
  await auditLogModel.record({
    actor_id: req.user.id, action: 'CONTACT_CREATED', entity_type: 'emergency_contact', entity_id: contact.id,
  });
  res.status(201).json({ contact });
});

const updateContact = asyncHandler(async (req, res) => {
  const contact = await contactModel.update(req.params.id, req.body);
  if (!contact) return res.status(404).json({ error: 'Contact not found.' });
  await auditLogModel.record({
    actor_id: req.user.id, action: 'CONTACT_UPDATED', entity_type: 'emergency_contact', entity_id: contact.id,
  });
  res.json({ contact });
});

const setActive = asyncHandler(async (req, res) => {
  const { is_active } = req.body;
  const contact = await contactModel.setActive(req.params.id, !!is_active);
  if (!contact) return res.status(404).json({ error: 'Contact not found.' });
  await auditLogModel.record({
    actor_id: req.user.id,
    action: is_active ? 'CONTACT_ENABLED' : 'CONTACT_DISABLED',
    entity_type: 'emergency_contact',
    entity_id: contact.id,
  });
  res.json({ contact });
});

const deleteContact = asyncHandler(async (req, res) => {
  const contact = await contactModel.findById(req.params.id);
  if (!contact) return res.status(404).json({ error: 'Contact not found.' });
  await contactModel.remove(req.params.id);
  await auditLogModel.record({
    actor_id: req.user.id, action: 'CONTACT_DELETED', entity_type: 'emergency_contact', entity_id: req.params.id,
  });
  res.json({ success: true });
});

module.exports = { listContacts, createContact, updateContact, setActive, deleteContact };
