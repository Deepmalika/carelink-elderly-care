const express = require('express');
const db = require('../db');
const { generateId } = require('../utils/id');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Create an elderly/patient profile (family users only)
router.post('/', requireAuth, requireRole('FAMILY'), async (req, res, next) => {
  try {
    const { name, age, gender, medicalNeeds, address } = req.body || {};
    if (!name || !age) {
      return res.status(400).json({ error: 'name and age are required.' });
    }

    const id = generateId('pat');
    await db.prepare(
      `INSERT INTO patients (id, name, age, gender, medical_needs, address, owner_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(id, name, age, gender || null, medicalNeeds || null, address || null, req.user.id);

    const patient = await db.prepare('SELECT * FROM patients WHERE id = ?').get(id);
    res.status(201).json({ patient });
  } catch (err) {
    next(err);
  }
});

// List the logged-in family member's patient profiles
router.get('/mine', requireAuth, requireRole('FAMILY'), async (req, res, next) => {
  try {
    const patients = await db.prepare('SELECT * FROM patients WHERE owner_id = ? ORDER BY created_at DESC').all(req.user.id);
    res.json({ patients });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const patient = await db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id);
    if (!patient) return res.status(404).json({ error: 'Patient profile not found.' });

    // Family users may only view their own patients; caregivers/admins may view for booking context
    if (req.user.role === 'FAMILY' && patient.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'You do not have access to this patient profile.' });
    }
    res.json({ patient });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', requireAuth, requireRole('FAMILY'), async (req, res, next) => {
  try {
    const patient = await db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id);
    if (!patient) return res.status(404).json({ error: 'Patient profile not found.' });
    if (patient.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'You do not have access to this patient profile.' });
    }

    const { name, age, gender, medicalNeeds, address } = req.body || {};
    await db.prepare(
      `UPDATE patients SET name = ?, age = ?, gender = ?, medical_needs = ?, address = ? WHERE id = ?`
    ).run(
      name ?? patient.name,
      age ?? patient.age,
      gender ?? patient.gender,
      medicalNeeds ?? patient.medical_needs,
      address ?? patient.address,
      req.params.id
    );

    const updated = await db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id);
    res.json({ patient: updated });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
