const crypto = require('crypto');

// Short, URL-friendly unique ids (not guessable enough to matter for this app's needs)
function generateId(prefix) {
  const raw = crypto.randomBytes(12).toString('base64url');
  return prefix ? `${prefix}_${raw}` : raw;
}

module.exports = { generateId };
