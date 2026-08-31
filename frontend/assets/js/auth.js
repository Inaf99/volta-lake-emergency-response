// Shared auth helpers used by every page.
function saveSession(user, token) {
  localStorage.setItem('laers_token', token);
  localStorage.setItem('laers_user', JSON.stringify(user));
}
function getSession() {
  const token = localStorage.getItem('laers_token');
  const userRaw = localStorage.getItem('laers_user');
  if (!token || !userRaw) return null;
  try { return { token, user: JSON.parse(userRaw) }; } catch { return null; }
}
function clearSession() {
  localStorage.removeItem('laers_token');
  localStorage.removeItem('laers_user');
}
function logout() {
  clearSession();
  window.location.href = '/index.html';
}
// Redirects to login if not authenticated, or to the correct home if the
// role doesn't match this page. Call at the top of each protected page.
// NOTE: paths here are root-absolute (leading "/") on purpose. This app is
// served with its frontend/ folder as the web root (see README — `npx serve .`),
// so "/pages/admin/dashboard.html" always resolves correctly no matter which
// folder depth the *current* page lives in. Plain relative paths like
// "pages/admin/dashboard.html" would break when redirecting FROM a page
// that already lives inside /pages/ or /pages/admin/.
function requireRole(expectedRoles) {
  const session = getSession();
  if (!session) { window.location.href = '/index.html'; return null; }
  if (expectedRoles && !expectedRoles.includes(session.user.role)) {
    window.location.href = roleHome(session.user.role);
    return null;
  }
  return session;
}
function roleHome(role) {
  switch (role) {
    case 'ADMIN': return '/pages/admin/dashboard.html';
    case 'RESPONDER': return '/pages/responder.html';
    case 'BOAT_OPERATOR': return '/pages/operator.html';
    default: return '/pages/passenger.html';
  }
}
