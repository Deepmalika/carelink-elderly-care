const express = require('express');
const db = require('../db');

const router = express.Router();

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8001';

// Public: families describe their situation in plain language, we return the
// best-matching service category (from the trained ML model) plus real
// services from the catalog in that category.
router.post('/', async (req, res) => {
  const { description } = req.body || {};
  if (!description || description.trim().length < 3) {
    return res.status(400).json({ error: 'Please describe the situation in a bit more detail.' });
  }

  let prediction;
  try {
    const mlRes = await fetch(`${ML_SERVICE_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: description.trim() }),
    });
    if (!mlRes.ok) {
      const body = await mlRes.json().catch(() => ({}));
      throw new Error(body.detail || `ML service responded with ${mlRes.status}`);
    }
    prediction = await mlRes.json();
  } catch (err) {
    return res.status(503).json({
      error: 'The triage assistant is temporarily unavailable. Please browse services manually instead.',
      detail: err.message,
    });
  }

  const matchingServices = await db
    .prepare('SELECT * FROM services WHERE active = 1 AND category = ? ORDER BY price')
    .all(prediction.topCategory);

  res.json({ prediction, matchingServices });
});

module.exports = router;
