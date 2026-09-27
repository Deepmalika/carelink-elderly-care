require('dotenv').config();
const db = require('./index');
const { generateId } = require('../utils/id');
const { hashPassword } = require('../utils/auth');

async function upsertUser({ name, email, password, phone, role }) {
  const existing = await db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (existing) return existing;
  const id = generateId('user');
  await db.prepare(
    `INSERT INTO users (id, name, email, password, phone, role) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, name, email, hashPassword(password), phone || null, role);
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

async function main() {
  await db.init();
  console.log('Seeding database...');

  // --- Admin ---
  const admin = await upsertUser({
    name: 'Platform Admin',
    email: 'admin@carelink.com',
    password: 'admin123',
    role: 'ADMIN',
  });

  // --- Sample services ---
  const services = [
    {
      name: 'Daily Nursing Visit',
      description: 'A registered nurse visits for vitals monitoring, wound care, and medication administration.',
      category: 'NURSING_CARE',
      durationMinutes: 60,
      price: 800,
      requiredQualification: 'Registered Nurse (RN/GNM/ANM)',
    },
    {
      name: '12-Hour Elderly Attendant',
      description: 'A trained attendant assists with daily activities: mobility, hygiene, and companionship.',
      category: 'ELDERLY_ATTENDANT',
      durationMinutes: 720,
      price: 1200,
      requiredQualification: 'Certified Home Health Attendant',
    },
    {
      name: 'Physiotherapy Session',
      description: 'A licensed physiotherapist provides mobility and rehabilitation exercises at home.',
      category: 'PHYSIOTHERAPY',
      durationMinutes: 45,
      price: 700,
      requiredQualification: 'BPT / MPT',
    },
    {
      name: 'Post-Hospital Recovery Care',
      description: 'Short-term intensive care following hospital discharge, including monitoring and follow-ups.',
      category: 'POST_HOSPITAL_CARE',
      durationMinutes: 480,
      price: 2200,
      requiredQualification: 'Registered Nurse with post-op experience',
    },
    {
      name: '24-Hour Live-in Nursing Care',
      description: 'Round-the-clock in-home nursing support for patients needing continuous supervision.',
      category: 'NURSING_CARE',
      durationMinutes: 1440,
      price: 2800,
      requiredQualification: 'Registered Nurse (RN/GNM/ANM)',
    },
    {
      name: 'Companion Care Visit',
      description: 'Light attendant support focused on companionship, light chores, and safety supervision.',
      category: 'ELDERLY_ATTENDANT',
      durationMinutes: 240,
      price: 500,
      requiredQualification: 'Basic caregiver training',
    },
  ];

  for (const s of services) {
    const existing = await db.prepare('SELECT id FROM services WHERE name = ?').get(s.name);
    if (existing) continue;
    await db.prepare(
      `INSERT INTO services (id, name, description, category, duration_minutes, price, required_qualification)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(generateId('svc'), s.name, s.description, s.category, s.durationMinutes, s.price, s.requiredQualification);
  }

  // --- Demo caregivers (verified, so the browse/booking flow works out of the box) ---
  const demoCaregivers = [
    {
      name: 'Anita Sharma', email: 'anita.caregiver@carelink.com', phone: '9876543210',
      qualification: 'Registered Nurse, GNM', experienceYears: 6,
      bio: 'Six years of experience in geriatric nursing and post-operative care.',
      serviceAreas: 'Mumbai, Thane', availability: 'Mon-Sat, 8am-8pm',
      categories: 'NURSING_CARE,POST_HOSPITAL_CARE',
    },
    {
      name: 'Ramesh Iyer', email: 'ramesh.caregiver@carelink.com', phone: '9876543211',
      qualification: 'Certified Home Health Attendant', experienceYears: 4,
      bio: 'Specializes in daily living assistance and companionship for elderly clients.',
      serviceAreas: 'Mumbai, Navi Mumbai', availability: 'All days, 24-hour shifts available',
      categories: 'ELDERLY_ATTENDANT',
    },
    {
      name: 'Priya Deshmukh', email: 'priya.caregiver@carelink.com', phone: '9876543212',
      qualification: 'BPT (Bachelor of Physiotherapy)', experienceYears: 5,
      bio: 'Focused on mobility recovery and pain management for elderly patients.',
      serviceAreas: 'Pune', availability: 'Mon-Fri, 9am-5pm',
      categories: 'PHYSIOTHERAPY',
    },
  ];

  for (const c of demoCaregivers) {
    const user = await upsertUser({ name: c.name, email: c.email, password: 'caregiver123', phone: c.phone, role: 'CAREGIVER' });
    const existingProfile = await db.prepare('SELECT * FROM caregivers WHERE user_id = ?').get(user.id);
    if (existingProfile) {
      await db.prepare(
        `UPDATE caregivers SET qualification = ?, experience_years = ?, bio = ?, service_areas = ?,
         availability = ?, categories = ?, verified = 1 WHERE user_id = ?`
      ).run(c.qualification, c.experienceYears, c.bio, c.serviceAreas, c.availability, c.categories, user.id);
    } else {
      await db.prepare(
        `INSERT INTO caregivers (id, user_id, qualification, experience_years, bio, service_areas, availability, categories, verified)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`
      ).run(generateId('cg'), user.id, c.qualification, c.experienceYears, c.bio, c.serviceAreas, c.availability, c.categories);
    }
  }

  // --- One unverified caregiver so the admin "pending review" queue has something to show ---
  const pendingCaregiverUser = await upsertUser({
    name: 'Suresh Patil', email: 'suresh.caregiver@carelink.com', phone: '9876543213', role: 'CAREGIVER', password: 'caregiver123',
  });
  const existingPendingProfile = await db.prepare('SELECT * FROM caregivers WHERE user_id = ?').get(pendingCaregiverUser.id);
  if (!existingPendingProfile) {
    await db.prepare(
      `INSERT INTO caregivers (id, user_id, qualification, experience_years, bio, service_areas, availability, categories, verified)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`
    ).run(
      generateId('cg'), pendingCaregiverUser.id, 'Certified Home Health Attendant', 2,
      'Newly registered, awaiting document verification.', 'Mumbai', 'Weekdays, 9am-5pm', 'ELDERLY_ATTENDANT'
    );
  }

  // --- Demo family account with a patient profile ---
  const family = await upsertUser({
    name: 'Kavita Rao', email: 'kavita.family@carelink.com', phone: '9876543214', password: 'family123', role: 'FAMILY',
  });
  const existingPatient = await db.prepare('SELECT * FROM patients WHERE owner_id = ?').get(family.id);
  if (!existingPatient) {
    await db.prepare(
      `INSERT INTO patients (id, name, age, gender, medical_needs, address, owner_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(generateId('pat'), 'Mohan Rao', 78, 'Male', 'Type 2 diabetes, requires daily monitoring', 'Andheri, Mumbai', family.id);
  }

  console.log('Seed complete.');
  console.log('--------------------------------------------------');
  console.log('Admin login:      admin@carelink.com / admin123');
  console.log('Family login:     kavita.family@carelink.com / family123');
  console.log('Caregiver login:  anita.caregiver@carelink.com / caregiver123');
  console.log('(unverified)      suresh.caregiver@carelink.com / caregiver123');
  console.log('--------------------------------------------------');
  await db.pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
