const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { recommendCaregivers, buildCaregiverProfileText } = require('../utils/ml');

const router = express.Router();

async function withUser(caregiver) {
  if (!caregiver) return caregiver;
  const user = await db.prepare('SELECT id, name, email, phone FROM users WHERE id = ?').get(caregiver.user_id);
  return { ...caregiver, user };
}

// Public browse — families search for verified caregivers by area/category
router.get('/', async (req, res, next) => {
  try {
    const { area, category, verifiedOnly } = req.query;
    let rows = await db.prepare('SELECT * FROM caregivers').all();

    if (verifiedOnly !== 'false') {
      rows = rows.filter((c) => c.verified === 1);
    }
    if (area) {
      rows = rows.filter((c) => (c.service_areas || '').toLowerCase().includes(area.toLowerCase()));
    }
    if (category) {
      rows = rows.filter((c) => (c.categories || '').split(',').includes(category));
    }

    const caregivers = await Promise.all(rows.map(withUser));
    res.json({ caregivers });
  } catch (err) {
    next(err);
  }
});

router.get('/me', requireAuth, requireRole('CAREGIVER'), async (req, res, next) => {
  try {
    const caregiver = await db.prepare('SELECT * FROM caregivers WHERE user_id = ?').get(req.user.id);
    if (!caregiver) return res.status(404).json({ error: 'Caregiver profile not found.' });
    res.json({ caregiver: await withUser(caregiver) });
  } catch (err) {
    next(err);
  }
});

// Content-based recommendation: rank verified caregivers for a specific patient,
// blending profile-text similarity with rating and experience. Falls back to
// the plain unranked list (still filtered/verified) if the ML service is down,
// so a family can always book even when this enrichment is unavailable.
router.get('/recommend', requireAuth, requireRole('FAMILY'), async (req, res, next) => {
  try {
    const { patientId, category } = req.query;
    if (!patientId) return res.status(400).json({ error: 'patientId is required.' });

    const patient = await db.prepare('SELECT * FROM patients WHERE id = ?').get(patientId);
    if (!patient || patient.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'You do not have access to this patient profile.' });
    }

    let candidates = await db.prepare('SELECT * FROM caregivers WHERE verified = 1').all();
    if (category) {
      candidates = candidates.filter((c) => (c.categories || '').split(',').includes(category));
    }
    const withUsers = await Promise.all(candidates.map(withUser));

    if (withUsers.length === 0) {
      return res.json({ caregivers: [], recommended: false });
    }

    const patientText = [patient.medical_needs, patient.name].filter(Boolean).join('. ');

    try {
      const { recommendations } = await recommendCaregivers(
        patientText,
        withUsers.map((c) => ({
          id: c.id,
          profileText: buildCaregiverProfileText(c),
          ratingAverage: c.rating_average,
          ratingCount: c.rating_count,
          experienceYears: c.experience_years,
        }))
      );
      const byId = new Map(withUsers.map((c) => [c.id, c]));
      const ranked = recommendations
        .map((r) => ({ ...byId.get(r.id), matchScore: r.score, matchReasons: r.reasons }))
        .filter((c) => c.id);

      res.json({ caregivers: ranked, recommended: true });
    } catch (err) {
      // ML service unavailable — fall back to the plain filtered list, unranked.
      res.json({ caregivers: withUsers, recommended: false });
    }
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const caregiver = await db.prepare('SELECT * FROM caregivers WHERE id = ?').get(req.params.id);
    if (!caregiver) return res.status(404).json({ error: 'Caregiver not found.' });
    res.json({ caregiver: await withUser(caregiver) });
  } catch (err) {
    next(err);
  }
});

// Caregiver completes/updates their own profile
router.put('/me', requireAuth, requireRole('CAREGIVER'), async (req, res, next) => {
  try {
    const caregiver = await db.prepare('SELECT * FROM caregivers WHERE user_id = ?').get(req.user.id);
    if (!caregiver) return res.status(404).json({ error: 'Caregiver profile not found.' });

    const { qualification, experienceYears, bio, serviceAreas, availability, categories } = req.body || {};
    await db.prepare(
      `UPDATE caregivers SET qualification = ?, experience_years = ?, bio = ?, service_areas = ?,
       availability = ?, categories = ? WHERE user_id = ?`
    ).run(
      qualification ?? caregiver.qualification,
      experienceYears ?? caregiver.experience_years,
      bio ?? caregiver.bio,
      serviceAreas ?? caregiver.service_areas,
      availability ?? caregiver.availability,
      Array.isArray(categories) ? categories.join(',') : (categories ?? caregiver.categories),
      req.user.id
    );

    const updated = await db.prepare('SELECT * FROM caregivers WHERE user_id = ?').get(req.user.id);
    res.json({ caregiver: await withUser(updated) });
  } catch (err) {
    next(err);
  }
});

// Admin: verify/onboard a caregiver
router.patch('/:id/verify', requireAuth, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const caregiver = await db.prepare('SELECT * FROM caregivers WHERE id = ?').get(req.params.id);
    if (!caregiver) return res.status(404).json({ error: 'Caregiver not found.' });

    const verified = req.body?.verified !== false;
    await db.prepare('UPDATE caregivers SET verified = ? WHERE id = ?').run(verified ? 1 : 0, req.params.id);

    const updated = await db.prepare('SELECT * FROM caregivers WHERE id = ?').get(req.params.id);
    res.json({ caregiver: await withUser(updated) });
  } catch (err) {
    next(err);
  }
});

// Caregiver's own earnings & work history (completed bookings)
router.get('/me/history', requireAuth, requireRole('CAREGIVER'), async (req, res, next) => {
  try {
    const caregiver = await db.prepare('SELECT * FROM caregivers WHERE user_id = ?').get(req.user.id);
    if (!caregiver) return res.status(404).json({ error: 'Caregiver profile not found.' });

    const bookings = await db.prepare(
      `SELECT b.*, s.name as service_name, s.price as service_price, p.name as patient_name
       FROM bookings b
       JOIN services s ON s.id = b.service_id
       JOIN patients p ON p.id = b.patient_id
       WHERE b.caregiver_id = ? AND b.status = 'COMPLETED'
       ORDER BY b.updated_at DESC`
    ).all(caregiver.id);

    const totalEarnings = bookings.reduce((sum, b) => sum + (b.service_price || 0), 0);
    res.json({ bookings, totalEarnings });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
