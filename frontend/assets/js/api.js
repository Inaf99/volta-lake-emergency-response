// Small fetch wrapper: attaches the JWT, parses JSON, and throws a
// readable Error on failure so pages can show a friendly message.
async function apiRequest(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = localStorage.getItem('laers_token');
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (networkErr) {
    throw new Error('Cannot reach the backend server. Is it running on http://localhost:5000?');
  }

  let data = {};
  try { data = await response.json(); } catch (_) { /* empty body is fine */ }

  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  return data;
}

const api = {
  register: (payload) => apiRequest('/auth/register', { method: 'POST', body: payload, auth: false }),
  login: (payload) => apiRequest('/auth/login', { method: 'POST', body: payload, auth: false }),
  me: () => apiRequest('/auth/me'),

  createEmergency: (payload) => apiRequest('/emergencies', { method: 'POST', body: payload }),
  listEmergencies: (query = '') => apiRequest(`/emergencies${query}`),
  listMyEmergencies: () => apiRequest('/emergencies/mine'),
  getEmergency: (id) => apiRequest(`/emergencies/${id}`),
  updateEmergencyStatus: (id, status) => apiRequest(`/emergencies/${id}/status`, { method: 'PATCH', body: { status } }),
  assignResponder: (id, responder_id) => apiRequest(`/emergencies/${id}/assign`, { method: 'PATCH', body: { responder_id } }),
  emergencyStats: () => apiRequest('/emergencies/stats/summary'),

  createBoat: (payload) => apiRequest('/boats', { method: 'POST', body: payload }),
  listBoats: () => apiRequest('/boats'),
  updateBoat: (id, payload) => apiRequest(`/boats/${id}`, { method: 'PUT', body: payload }),
  deleteBoat: (id) => apiRequest(`/boats/${id}`, { method: 'DELETE' }),

  startTrip: (payload) => apiRequest('/trips', { method: 'POST', body: payload }),
  endTrip: (id) => apiRequest(`/trips/${id}/end`, { method: 'PATCH' }),
  myActiveTrip: () => apiRequest('/trips/active/mine'),
  updateTripLocation: (id, payload) => apiRequest(`/trips/${id}/location`, { method: 'PATCH', body: payload }),

  listContacts: () => apiRequest('/emergency-contacts'),
  createContact: (payload) => apiRequest('/emergency-contacts', { method: 'POST', body: payload }),
  updateContact: (id, payload) => apiRequest(`/emergency-contacts/${id}`, { method: 'PUT', body: payload }),
  setContactActive: (id, is_active) => apiRequest(`/emergency-contacts/${id}/active`, { method: 'PATCH', body: { is_active } }),
  deleteContact: (id) => apiRequest(`/emergency-contacts/${id}`, { method: 'DELETE' }),

  listResponders: () => apiRequest('/responders'),
  updateResponder: (id, payload) => apiRequest(`/responders/${id}`, { method: 'PATCH', body: payload }),

  listSmsLogs: () => apiRequest('/sms-logs'),
};
