const express = require('express');
const db = require('../db');
const { generateId } = require('../utils/id');
const { requireAuth, requireRole } = require('../middleware/auth');
const { analyzeSentiment } = require('../utils/ml');

const router = express.Router();

// Matches the format SQLite's datetime('now') produced, so stored strings
// (and everything downstream that parses them) stay identical after the
// Postgres migration.
const NOW_EXPR = "to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD HH24:MI:SS')";

async function hydrate(booking) {
  const patient = await db.prepare('SELECT * FROM patients WHERE id = ?').get(booking.patient_id);
  const service = await db.prepare('SELECT * FROM services WHERE id = ?').get(booking.service_id);
  const caregiver = await db.prepare('SELECT * FROM caregivers WHERE id = ?').get(booking.caregiver_id);
  const caregiverUser = caregiver
    ? await db.prepare('SELECT id, name, phone FROM users WHERE id = ?').get(caregiver.user_id)
    : null;
  return {
    ...booking,
    patient,
    service,
    caregiver: caregiver ? { ...caregiver, user: caregiverUser } : null,
  };
}

async function assertFamilyOwnsPatient(userId, patientId) {
  const patient = await db.prepare('SELECT * FROM patients WHERE id = ?').get(patientId);
  return patient && patient.owner_id === userId ? patient : null;
}

// Family creates a service request for one of their patients
router.post('/', requireAuth, requireRole('FAMILY'), async (req, res, next) => {
  try {
    const { patientId, caregiverId, serviceId, scheduledDate } = req.body || {};
    if (!patientId || !caregiverId || !serviceId || !scheduledDate) {
      return res.status(400).json({ error: 'patientId, caregiverId, serviceId, and scheduledDate are required.' });
    }

    const patient = await assertFamilyOwnsPatient(req.user.id, patientId);
    if (!patient) return res.status(403).json({ error: 'You can only book services for your own patient profiles.' });

    const caregiver = await db.prepare('SELECT * FROM caregivers WHERE id = ?').get(caregiverId);
    if (!caregiver || !caregiver.verified) {
      return res.status(400).json({ error: 'Selected caregiver is not available for booking.' });
    }
    const service = await db.prepare('SELECT * FROM services WHERE id = ?').get(serviceId);
    if (!service || !service.active) {
      return res.status(400).json({ error: 'Selected service is not available.' });
    }

    const id = generateId('bk');
    await db.prepare(
      `INSERT INTO bookings (id, scheduled_date, patient_id, caregiver_id, service_id) VALUES (?, ?, ?, ?, ?)`
    ).run(id, scheduledDate, patientId, caregiverId, serviceId);

    const created = await db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
    res.status(201).json({ booking: await hydrate(created) });
  } catch (err) {
    next(err);
  }
});

// Role-aware "my bookings" list
router.get('/mine', requireAuth, async (req, res, next) => {
  try {
    let rows;
    if (req.user.role === 'FAMILY') {
      rows = await db.prepare(
        `SELECT b.* FROM bookings b JOIN patients p ON p.id = b.patient_id
         WHERE p.owner_id = ? ORDER BY b.created_at DESC`
      ).all(req.user.id);
    } else if (req.user.role === 'CAREGIVER') {
      const caregiver = await db.prepare('SELECT * FROM caregivers WHERE user_id = ?').get(req.user.id);
      rows = caregiver
        ? await db.prepare('SELECT * FROM bookings WHERE caregiver_id = ? ORDER BY created_at DESC').all(caregiver.id)
        : [];
    } else {
      rows = await db.prepare('SELECT * FROM bookings ORDER BY created_at DESC').all();
    }
    const bookings = await Promise.all(rows.map(hydrate));
    res.json({ bookings });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const booking = await db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });
    res.json({ booking: await hydrate(booking) });
  } catch (err) {
    next(err);
  }
});

async function requireCaregiverOwnsBooking(req, res, booking) {
  const caregiver = await db.prepare('SELECT * FROM caregivers WHERE user_id = ?').get(req.user.id);
  if (!caregiver || booking.caregiver_id !== caregiver.id) {
    res.status(403).json({ error: 'You do not have access to this booking.' });
    return null;
  }
  return caregiver;
}

router.patch('/:id/accept', requireAuth, requireRole('CAREGIVER'), async (req, res, next) => {
  try {
    const booking = await db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });
    if (!(await requireCaregiverOwnsBooking(req, res, booking))) return;
    if (booking.status !== 'PENDING') {
      return res.status(400).json({ error: `Booking is already ${booking.status.toLowerCase()}.` });
    }

    await db.prepare(`UPDATE bookings SET status = 'ACCEPTED', updated_at = ${NOW_EXPR} WHERE id = ?`).run(req.params.id);
    const updated = await db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
    res.json({ booking: await hydrate(updated) });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/reject', requireAuth, requireRole('CAREGIVER'), async (req, res, next) => {
  try {
    const booking = await db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });
    if (!(await requireCaregiverOwnsBooking(req, res, booking))) return;
    if (booking.status !== 'PENDING') {
      return res.status(400).json({ error: `Booking is already ${booking.status.toLowerCase()}.` });
    }

    await db.prepare(`UPDATE bookings SET status = 'REJECTED', updated_at = ${NOW_EXPR} WHERE id = ?`).run(req.params.id);
    const updated = await db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
    res.json({ booking: await hydrate(updated) });
  } catch (err) {
    next(err);
  }
});

// Caregiver progresses the booking through its lifecycle
router.patch('/:id/status', requireAuth, requireRole('CAREGIVER'), async (req, res, next) => {
  try {
    const booking = await db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });
    if (!(await requireCaregiverOwnsBooking(req, res, booking))) return;

    const { status } = req.body || {};
    const allowedTransitions = {
      ACCEPTED: ['IN_PROGRESS', 'CANCELLED'],
      IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
    };
    const allowed = allowedTransitions[booking.status] || [];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: `Cannot move booking from ${booking.status} to ${status}.` });
    }

    await db.prepare(`UPDATE bookings SET status = ?, updated_at = ${NOW_EXPR} WHERE id = ?`).run(status, req.params.id);

    const updated = await db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
    res.json({ booking: await hydrate(updated) });
  } catch (err) {
    next(err);
  }
});

// Family rates a completed booking
router.patch('/:id/rate', requireAuth, requireRole('FAMILY'), async (req, res, next) => {
  try {
    const booking = await db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });
    const patient = await assertFamilyOwnsPatient(req.user.id, booking.patient_id);
    if (!patient) return res.status(403).json({ error: 'You do not have access to this booking.' });
    if (booking.status !== 'COMPLETED') {
      return res.status(400).json({ error: 'Only completed bookings can be rated.' });
    }

    const { score, comment } = req.body || {};
    if (!score || score < 1 || score > 5) {
      return res.status(400).json({ error: 'score must be between 1 and 5.' });
    }

    // Run sentiment analysis on the comment (if any) so admins can catch concerning
    // feedback even when the star rating alone wouldn't flag it. Never blocks the
    // rating itself if the ML service happens to be unavailable.
    let sentiment = null;
    if (comment && comment.trim()) {
      sentiment = await analyzeSentiment(comment.trim());
    }

    await db.prepare(
      'UPDATE bookings SET rating_score = ?, rating_comment = ?, sentiment_label = ?, sentiment_score = ? WHERE id = ?'
    ).run(score, comment || null, sentiment?.label || null, sentiment?.confidence ?? null, req.params.id);

    const caregiver = await db.prepare('SELECT * FROM caregivers WHERE id = ?').get(booking.caregiver_id);
    const newCount = caregiver.rating_count + 1;
    const newAverage = (caregiver.rating_average * caregiver.rating_count + score) / newCount;
    await db.prepare('UPDATE caregivers SET rating_average = ?, rating_count = ? WHERE id = ?').run(
      newAverage, newCount, caregiver.id
    );

    const updated = await db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
    res.json({ booking: await hydrate(updated) });
  } catch (err) {
    next(err);
  }
});

// Family deletes their own rating/review — or an admin deletes any review.
// Rolls back the caregiver's rating_average/rating_count so the aggregate
// stays consistent with the review actually being removed, not just hidden.
router.delete('/:id/review', requireAuth, async (req, res, next) => {
  try {
    const booking = await db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });
    if (booking.rating_score == null) return res.status(404).json({ error: 'This booking has no review.' });

    const patient = await db.prepare('SELECT * FROM patients WHERE id = ?').get(booking.patient_id);
    const isAuthor = req.user.role === 'FAMILY' && patient && patient.owner_id === req.user.id;
    if (!isAuthor && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only the reviewer can delete this review.' });
    }

    const caregiver = await db.prepare('SELECT * FROM caregivers WHERE id = ?').get(booking.caregiver_id);
    if (caregiver && caregiver.rating_count > 0) {
      const newCount = caregiver.rating_count - 1;
      const newAverage = newCount > 0
        ? (caregiver.rating_average * caregiver.rating_count - booking.rating_score) / newCount
        : 0;
      await db.prepare('UPDATE caregivers SET rating_average = ?, rating_count = ? WHERE id = ?').run(
        newAverage, newCount, caregiver.id
      );
    }

    await db.prepare(
      `UPDATE bookings SET rating_score = NULL, rating_comment = NULL, sentiment_label = NULL, sentiment_score = NULL
       WHERE id = ?`
    ).run(req.params.id);

    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// Care notes — visible to the family (owner) and the assigned caregiver
router.post('/:id/notes', requireAuth, async (req, res, next) => {
  try {
    const booking = await db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });

    const isOwner = req.user.role === 'FAMILY' && await assertFamilyOwnsPatient(req.user.id, booking.patient_id);
    const caregiver = await db.prepare('SELECT * FROM caregivers WHERE user_id = ?').get(req.user.id);
    const isCaregiver = req.user.role === 'CAREGIVER' && caregiver && caregiver.id === booking.caregiver_id;
    if (!isOwner && !isCaregiver && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'You do not have access to this booking.' });
    }

    const { note } = req.body || {};
    if (!note) return res.status(400).json({ error: 'note is required.' });

    const sentiment = await analyzeSentiment(note.trim());

    const id = generateId('note');
    await db.prepare(
      'INSERT INTO care_notes (id, note, booking_id, author_id, sentiment_label, sentiment_score) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, note, req.params.id, req.user.id, sentiment?.label || null, sentiment?.confidence ?? null);

    const created = await db.prepare('SELECT * FROM care_notes WHERE id = ?').get(id);
    res.status(201).json({ note: created });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/notes', requireAuth, async (req, res, next) => {
  try {
    const notes = await db.prepare(
      `SELECT n.*, u.name as author_name, u.role as author_role FROM care_notes n
       JOIN users u ON u.id = n.author_id WHERE n.booking_id = ? ORDER BY n.created_at ASC`
    ).all(req.params.id);
    res.json({ notes });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id/notes/:noteId', requireAuth, async (req, res, next) => {
  try {
    const booking = await db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });

    const note = await db.prepare('SELECT * FROM care_notes WHERE id = ? AND booking_id = ?').get(req.params.noteId, req.params.id);
    if (!note) return res.status(404).json({ error: 'Note not found.' });

    // Only the note's own author may delete it — admins can delete any note.
    const isAuthor = note.author_id === req.user.id;
    if (!isAuthor && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only the author of this note can delete it.' });
    }

    await db.prepare('DELETE FROM care_notes WHERE id = ?').run(req.params.noteId);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
