const env = require('../config/env');

function buildMapLink(lat, lng) {
  return env.mapUrlTemplate.replace(/{lat}/g, lat).replace(/{lng}/g, lng);
}

module.exports = buildMapLink;
