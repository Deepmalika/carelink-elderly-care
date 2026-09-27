const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, requireRole('ADMIN'));

router.get('/users', async (req, res, next) => {
  try {
    const users = await db.prepare('SELECT id, name, email, phone, role, created_at FROM users ORDER BY created_at DESC').all();
    res.json({ users });
  } catch (err) {
    next(err);
  }
});

router.get('/caregivers/pending', async (req, res, next) => {
  try {
    const rows = await db.prepare('SELECT * FROM caregivers WHERE verified = 0').all();
    const withUsers = await Promise.all(rows.map(async (c) => ({
      ...c,
      user: await db.prepare('SELECT id, name, email, phone FROM users WHERE id = ?').get(c.user_id),
    })));
    res.json({ caregivers: withUsers });
  } catch (err) {
    next(err);
  }
});

router.get('/caregivers', async (req, res, next) => {
  try {
    const rows = await db.prepare('SELECT * FROM caregivers ORDER BY created_at DESC').all();
    const withUsers = await Promise.all(rows.map(async (c) => ({
      ...c,
      user: await db.prepare('SELECT id, name, email, phone FROM users WHERE id = ?').get(c.user_id),
    })));
    res.json({ caregivers: withUsers });
  } catch (err) {
    next(err);
  }
});

// Negative-sentiment ratings and care notes, surfaced for admin review even
// when the star rating alone wouldn't have flagged anything.
router.get('/sentiment-flags', async (req, res, next) => {
  try {
    const flaggedRatings = await db.prepare(
      `SELECT b.id as booking_id, b.rating_score, b.rating_comment, b.sentiment_label, b.sentiment_score,
              p.name as patient_name, u.name as caregiver_name
       FROM bookings b
       JOIN patients p ON p.id = b.patient_id
       JOIN caregivers c ON c.id = b.caregiver_id
       JOIN users u ON u.id = c.user_id
       WHERE b.sentiment_label = 'NEGATIVE'
       ORDER BY b.updated_at DESC`
    ).all();

    const flaggedNotes = await db.prepare(
      `SELECT n.id as note_id, n.booking_id, n.note, n.sentiment_label, n.sentiment_score, n.created_at,
              au.name as author_name, au.role as author_role,
              p.name as patient_name
       FROM care_notes n
       JOIN users au ON au.id = n.author_id
       JOIN bookings b ON b.id = n.booking_id
       JOIN patients p ON p.id = b.patient_id
       WHERE n.sentiment_label = 'NEGATIVE'
       ORDER BY n.created_at DESC`
    ).all();

    res.json({ flaggedRatings, flaggedNotes });
  } catch (err) {
    next(err);
  }
});

// All care notes across every booking — for the moderation view. Unlike
// /sentiment-flags this is unfiltered: every note, positive/neutral/negative.
// Deletion reuses DELETE /bookings/:bookingId/notes/:noteId, which already
// permits admins — no separate delete route needed here.
router.get('/care-notes', async (req, res, next) => {
  try {
    const notes = await db.prepare(
      `SELECT n.id as note_id, n.booking_id, n.note, n.sentiment_label, n.sentiment_score, n.created_at,
              au.name as author_name, au.role as author_role,
              p.name as patient_name, u.name as caregiver_name
       FROM care_notes n
       JOIN users au ON au.id = n.author_id
       JOIN bookings b ON b.id = n.booking_id
       JOIN patients p ON p.id = b.patient_id
       JOIN caregivers c ON c.id = b.caregiver_id
       JOIN users u ON u.id = c.user_id
       ORDER BY n.created_at DESC`
    ).all();
    res.json({ notes });
  } catch (err) {
    next(err);
  }
});

// All family reviews across every booking — for the moderation view.
// Deletion reuses DELETE /bookings/:bookingId/review, which already permits
// admins — no separate delete route needed here.
router.get('/reviews', async (req, res, next) => {
  try {
    const reviews = await db.prepare(
      `SELECT b.id as booking_id, b.rating_score, b.rating_comment, b.sentiment_label, b.sentiment_score, b.updated_at,
              p.name as patient_name, p.owner_id, u.name as caregiver_name
       FROM bookings b
       JOIN patients p ON p.id = b.patient_id
       JOIN caregivers c ON c.id = b.caregiver_id
       JOIN users u ON u.id = c.user_id
       WHERE b.rating_score IS NOT NULL
       ORDER BY b.updated_at DESC`
    ).all();
    res.json({ reviews });
  } catch (err) {
    next(err);
  }
});

// KPIs called out in the PRD: registered users, verified caregivers, booking completion
// rate, average response time, satisfaction score, monthly active users.
router.get('/analytics', async (req, res, next) => {
  try {
    // Postgres returns COUNT/AVG as strings (they're BIGINT/NUMERIC under the
    // hood, which JS can't represent losslessly) — Number(...) restores the
    // same plain-number shape the frontend and the math below expect.
    const registeredUsers = Number((await db.prepare('SELECT COUNT(*) as n FROM users').get()).n);
    const verifiedCaregivers = Number((await db.prepare('SELECT COUNT(*) as n FROM caregivers WHERE verified = 1').get()).n);

    const totalBookings = Number((await db.prepare('SELECT COUNT(*) as n FROM bookings').get()).n);
    const completedBookings = Number((await db.prepare(`SELECT COUNT(*) as n FROM bookings WHERE status = 'COMPLETED'`).get()).n);
    const bookingCompletionRate = totalBookings ? Math.round((completedBookings / totalBookings) * 1000) / 10 : 0;

    // Average response time = time from booking creation to first accept/reject, in hours
    const responseRows = await db.prepare(
      `SELECT created_at, updated_at FROM bookings WHERE status IN ('ACCEPTED','REJECTED','IN_PROGRESS','COMPLETED','CANCELLED')`
    ).all();
    let avgResponseHours = 0;
    if (responseRows.length) {
      const totalMs = responseRows.reduce((sum, r) => {
        return sum + (new Date(r.updated_at + 'Z') - new Date(r.created_at + 'Z'));
      }, 0);
      avgResponseHours = Math.round((totalMs / responseRows.length / 3600000) * 10) / 10;
    }

    const ratingRow = await db.prepare(
      `SELECT AVG(rating_score) as avg, COUNT(rating_score) as n FROM bookings WHERE rating_score IS NOT NULL`
    ).get();
    const satisfactionScore = ratingRow.avg ? Math.round(Number(ratingRow.avg) * 10) / 10 : 0;

    // Monthly active users = users who own a patient with activity, or caregivers with a booking, in last 30 days
    const monthlyActiveUsers = Number((await db.prepare(
      `SELECT COUNT(DISTINCT owner_id) as n FROM patients p
       JOIN bookings b ON b.patient_id = p.id
       WHERE b.created_at >= to_char((now() AT TIME ZONE 'utc') - interval '30 days', 'YYYY-MM-DD HH24:MI:SS')`
    ).get()).n);

    res.json({
      registeredUsers,
      verifiedCaregivers,
      totalBookings,
      completedBookings,
      bookingCompletionRate,
      avgResponseHours,
      satisfactionScore,
      ratingCount: Number(ratingRow.n),
      monthlyActiveUsers,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
