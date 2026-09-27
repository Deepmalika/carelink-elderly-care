require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const db = require('./db');

const authRoutes = require('./routes/auth');
const patientRoutes = require('./routes/patients');
const serviceRoutes = require('./routes/services');
const caregiverRoutes = require('./routes/caregivers');
const bookingRoutes = require('./routes/bookings');
const adminRoutes = require('./routes/admin');
const triageRoutes = require('./routes/triage');

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || true }));
app.use(express.json());
app.use(morgan('dev'));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/caregivers', caregiverRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/triage', triageRoutes);

// 404 + error handling
app.use((req, res) => res.status(404).json({ error: 'Not found.' }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

const PORT = process.env.PORT || 4000;

// Postgres connection + schema setup is async (unlike the old SQLite file
// open, which happened synchronously at require time), so the schema must
// be ready before the server starts accepting requests.
db.init()
  .then(() => {
    app.listen(PORT, () => console.log(`Elderly Care API listening on port ${PORT}`));
  })
  .catch((err) => {
    console.error('Failed to initialize the database:', err);
    process.exit(1);
  });
