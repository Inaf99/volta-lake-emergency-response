// OFFLINE EMERGENCY RESPONSE
//
// The backend SMS pipeline only works when the device can reach the API.
// This module covers the case where it can't: the phone itself still has
// a cell signal (SMS doesn't need data/wifi), so we fall back to the
// device's own native SMS app instead of our server.
//
// Two things happen while online, ahead of any emergency:
//   1. cacheOfflineContacts() pulls admin/responder/emergency-contact
//      phone numbers into localStorage.
//   2. flushQueuedEmergencies() runs on load and on the 'online' event, to
//      sync anything that was queued while offline.
//
// When SOS is pressed with no connectivity, sendEmergencyOffline() builds
// the same alert text the server would have sent, picks the nearest cached
// responder (same planar-distance formula the backend uses) plus every
// cached admin, opens the phone's SMS app pre-filled with that message,
// and queues the emergency locally so it syncs to the real database the
// next time the app is back online.

const OFFLINE_CONTACTS_KEY = 'laers_offline_contacts';
const OFFLINE_QUEUE_KEY = 'laers_offline_queue';

async function cacheOfflineContacts() {
  if (!navigator.onLine) return;
  try {
    const data = await apiRequest('/offline-contacts');
    localStorage.setItem(OFFLINE_CONTACTS_KEY, JSON.stringify(data));
  } catch (_) {
    // Fine to fail quietly — this is opportunistic caching, not a user-facing action.
  }
}

function getCachedContacts() {
  try {
    return JSON.parse(localStorage.getItem(OFFLINE_CONTACTS_KEY) || 'null');
  } catch (_) {
    return null;
  }
}

function nearestCachedResponder(lat, lng, responders) {
  const withLocation = (responders || []).filter(
    (r) => r.availability_status === 'AVAILABLE' && r.latitude != null && r.longitude != null
  );
  if (!withLocation.length) return null;
  return withLocation.reduce((best, r) => {
    const distSq = (r.latitude - lat) ** 2 + (r.longitude - lng) ** 2;
    return !best || distSq < best.distSq ? { ...r, distSq } : best;
  }, null);
}

function buildOfflineSmsMessage({ emergencyType, reporterName, boatLabel, gps }) {
  const mapLink = `https://www.openstreetmap.org/?mlat=${gps.latitude}&mlon=${gps.longitude}#map=16/${gps.latitude}/${gps.longitude}`;
  return [
    'EMERGENCY ALERT - VOLTA LAKE (sent offline)',
    '',
    `Type: ${(emergencyType || 'UNSPECIFIED').replace(/_/g, ' ')}`,
    `Reporter: ${reporterName || 'Unknown'}`,
    `Boat: ${boatLabel || 'N/A'}`,
    `Location: ${gps.latitude.toFixed(4)}, ${gps.longitude.toFixed(4)}`,
    `Time: ${new Date().toISOString().slice(11, 16)} UTC`,
    '',
    `Map: ${mapLink}`,
    '',
    'Please respond immediately.',
  ].join('\n');
}

// Builds an sms: URI that opens the phone's native messaging app with the
// recipients and message pre-filled. The person still has to tap "Send"
// themselves — no web page can silently send SMS on someone's behalf,
// this is the closest a browser can get.
function buildSmsUri(numbers, message) {
  const list = numbers.join(',');
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const separator = isIOS ? '&' : '?';
  return `sms:${list}${separator}body=${encodeURIComponent(message)}`;
}

function queueEmergencyOffline(payload) {
  const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
  queue.push({ ...payload, queued_at: new Date().toISOString(), local_id: `local-${Date.now()}` });
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
}

async function flushQueuedEmergencies() {
  if (!navigator.onLine) return;
  const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
  if (!queue.length) return;

  const remaining = [];
  for (const item of queue) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await api.createEmergency(item);
    } catch (_) {
      remaining.push(item); // still offline or server rejected it — keep it queued
    }
  }
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining));
  return { synced: queue.length - remaining.length, stillQueued: remaining.length };
}

// The offline SOS entry point. Returns { message, recipients, smsUri } so
// the calling page can open the SMS app and show the right confirmation UI.
function sendEmergencyOffline({ emergencyType, reporterName, boatLabel, gps, boat_id, trip_id, description }) {
  const cached = getCachedContacts() || { admins: [], responders: [], emergency_contacts: [] };
  const message = buildOfflineSmsMessage({ emergencyType, reporterName, boatLabel, gps });

  const nearest = nearestCachedResponder(gps.latitude, gps.longitude, cached.responders);
  const recipients = [
    ...(nearest ? [{ name: nearest.name, phone: nearest.phone }] : []),
    ...cached.admins,
    ...cached.emergency_contacts,
  ];

  queueEmergencyOffline({
    boat_id: boat_id || null,
    trip_id: trip_id || null,
    emergency_type: emergencyType || 'OTHER',
    description,
    latitude: gps.latitude,
    longitude: gps.longitude,
    location_accuracy: gps.accuracy,
  });

  const numbers = recipients.map((r) => r.phone).filter(Boolean);
  return {
    message,
    recipients,
    smsUri: numbers.length ? buildSmsUri(numbers, message) : null,
  };
}

window.addEventListener('online', () => {
  cacheOfflineContacts();
  flushQueuedEmergencies();
});

// Cache opportunistically on every page load where this script is included.
cacheOfflineContacts();
flushQueuedEmergencies();
