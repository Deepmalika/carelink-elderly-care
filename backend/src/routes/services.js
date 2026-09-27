const express = require('express');
const db = require('../db');
const { generateId } = require('../utils/id');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

const CATEGORIES = ['NURSING_CARE', 'ELDERLY_ATTENDANT', 'PHYSIOTHERAPY', 'POST_HOSPITAL_CARE'];

// Public browse — anyone can see the active service catalog
router.get('/', async (req, res, next) => {
  try {
    const { category } = req.query;
    let services;
    if (category && CATEGORIES.includes(category)) {
      services = await db.prepare('SELECT * FROM services WHERE active = 1 AND category = ? ORDER BY name').all(category);
    } else {
      services = await db.prepare('SELECT * FROM services WHERE active = 1 ORDER BY name').all();
    }
    res.json({ services });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const service = await db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id);
    if (!service) return res.status(404).json({ error: 'Service not found.' });
    res.json({ service });
  } catch (err) {
    next(err);
  }
});

// Admin: create a new service offering
router.post('/', requireAuth, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const { name, description, category, durationMinutes, price, requiredQualification } = req.body || {};
    if (!name || !category || price == null) {
      return res.status(400).json({ error: 'name, category, and price are required.' });
    }
    if (!CATEGORIES.includes(category)) {
      return res.status(400).json({ error: `category must be one of ${CATEGORIES.join(', ')}` });
    }

    const id = generateId('svc');
    await db.prepare(
      `INSERT INTO services (id, name, description, category, duration_minutes, price, required_qualification)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(id, name, description || null, category, durationMinutes || 60, price, requiredQualification || null);

    const service = await db.prepare('SELECT * FROM services WHERE id = ?').get(id);
    res.status(201).json({ service });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', requireAuth, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const existing = await db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Service not found.' });

    const { name, description, category, durationMinutes, price, requiredQualification, active } = req.body || {};
    await db.prepare(
      `UPDATE services SET name = ?, description = ?, category = ?, duration_minutes = ?, price = ?,
       required_qualification = ?, active = ? WHERE id = ?`
    ).run(
      name ?? existing.name,
      description ?? existing.description,
      category ?? existing.category,
      durationMinutes ?? existing.duration_minutes,
      price ?? existing.price,
      requiredQualification ?? existing.required_qualification,
      active != null ? (active ? 1 : 0) : existing.active,
      req.params.id
    );

    const service = await db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id);
    res.json({ service });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAuth, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const existing = await db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Service not found.' });
    await db.prepare('UPDATE services SET active = 0 WHERE id = ?').run(req.params.id);
    res.json({ message: 'Service deactivated.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
