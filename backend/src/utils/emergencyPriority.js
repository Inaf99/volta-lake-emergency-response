// Maps a raw emergency_type to a default priority. The frontend can still
// show this to the user before submit; the backend recomputes it anyway
// so a tampered request body can't downgrade a critical emergency.
const CRITICAL_TYPES = new Set([
  'BOAT_SINKING',
  'BOAT_CAPSIZING',
  'PERSON_OVERBOARD',
  'FIRE',
  'COLLISION',
  'MEDICAL_EMERGENCY',
]);

const HIGH_TYPES = new Set([
  'ENGINE_FAILURE',
  'BAD_WEATHER',
  'MISSING_BOAT_PERSON',
  'SECURITY_THREAT',
]);

function priorityForType(emergencyType) {
  if (CRITICAL_TYPES.has(emergencyType)) return 'CRITICAL';
  if (HIGH_TYPES.has(emergencyType)) return 'HIGH';
  return 'NORMAL';
}

module.exports = { priorityForType };
