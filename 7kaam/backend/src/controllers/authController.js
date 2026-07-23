const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../utils/prisma');

function signAccessToken(admin) {
  return jwt.sign(
    { id: admin.id, email: admin.email, role: admin.role },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

function signRefreshToken(admin) {
  return jwt.sign(
    { id: admin.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '30d' }
  );
}

async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password required' });

  const admin = await prisma.admin.findUnique({ where: { email } });
  if (!admin) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, admin.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const accessToken = signAccessToken(admin);
  const refreshToken = signRefreshToken(admin);

  res.json({
    accessToken,
    refreshToken,
    admin: { id: admin.id, email: admin.email, role: admin.role, city: admin.city },
  });
}

async function refresh(req, res) {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const admin = await prisma.admin.findUnique({ where: { id: payload.id } });
    if (!admin) return res.status(401).json({ error: 'Admin not found' });

    const accessToken = signAccessToken(admin);
    res.json({ accessToken });
  } catch {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
}

async function logout(_req, res) {
  // Stateless JWT — just acknowledge. Client should discard tokens.
  res.json({ message: 'Logged out successfully' });
}

module.exports = { login, refresh, logout };
