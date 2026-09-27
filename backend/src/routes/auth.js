const express = require('express');
const db = require('../db');
const { generateId } = require('../utils/id');
const { hashPassword, comparePassword, signToken } = require('../utils/auth');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function toPublicUser(user) {
  const { password, ...rest } = user;
  return rest;
}

// Register — role is FAMILY or CAREGIVER (ADMIN accounts are seeded, not self-registered)
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, phone, role } = req.body || {};

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'name, email, password, and role are required.' });
    }
    if (!['FAMILY', 'CAREGIVER'].includes(role)) {
      return res.status(400).json({ error: 'role must be FAMILY or CAREGIVER.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const existing = await db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const id = generateId('user');
    const passwordHash = hashPassword(password);

    await db.prepare(
      `INSERT INTO users (id, name, email, password, phone, role) VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, name, email.toLowerCase(), passwordHash, phone || null, role);

    // Caregivers get an empty profile shell immediately so they show up (unverified) for admin review
    if (role === 'CAREGIVER') {
      await db.prepare(
        `INSERT INTO caregivers (id, user_id, qualification, categories) VALUES (?, ?, ?, ?)`
      ).run(generateId('cg'), id, 'Not yet specified', '');
    }

    const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    const token = signToken(user);
    res.status(201).json({ token, user: toPublicUser(user) });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required.' });
    }

    const user = await db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
    if (!user || !comparePassword(password, user.password)) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = signToken(user);
    res.json({ token, user: toPublicUser(user) });
  } catch (err) {
    next(err);
  }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({ user: toPublicUser(user) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
