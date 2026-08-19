const jwt = require('jsonwebtoken');

function verifyToken(req) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return null;
  }
}

// Attaches req.auth when a valid token is present; never rejects the request.
// Use for endpoints whose response shape changes based on auth (e.g. public
// worker profile — phone number only included when authenticated).
function authenticateOptional(req, res, next) {
  const payload = verifyToken(req);
  if (payload) req.auth = payload;
  next();
}

// Rejects the request with 401 unless a valid token is present.
function requireAuth(req, res, next) {
  const payload = verifyToken(req);
  if (!payload) return res.status(401).json({ error: 'Authentication required' });
  req.auth = payload;
  next();
}

// Must run after requireAuth/authenticateOptional. 403s if req.auth.role
// isn't one of the allowed roles.
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.auth || !roles.includes(req.auth.role)) {
      return res.status(403).json({ error: 'Forbidden — insufficient role' });
    }
    next();
  };
}

module.exports = { authenticateOptional, requireAuth, requireRole };
