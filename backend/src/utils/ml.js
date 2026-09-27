const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8001';

// Sentiment analysis is a nice-to-have enrichment, never a hard dependency:
// if the ML service is down, callers should just proceed without a sentiment
// label rather than fail the user's request (submitting a rating or a care
// note should never break because a side-feature is offline).
async function analyzeSentiment(text) {
  try {
    const res = await fetch(`${ML_SERVICE_URL}/analyze-sentiment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('Sentiment analysis unavailable:', err.message);
    return null;
  }
}

// Caregiver recommendation calls THROUGH to the ML service and lets the
// caller decide how to handle failure, since the booking flow has a
// meaningful fallback (the plain, unranked caregiver list) if this fails.
async function recommendCaregivers(patientText, caregivers) {
  const res = await fetch(`${ML_SERVICE_URL}/recommend-caregivers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ patientText, caregivers }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `ML service responded with ${res.status}`);
  }
  return res.json();
}

// Category-relevant vocabulary appended to each caregiver's profile text
// before scoring, so a patient's clinical language (e.g. "diabetes",
// "insulin") has a chance of overlapping with what the caregiver's category
// is about, even when their bio happens to use different words.
const CATEGORY_KEYWORDS = {
  NURSING_CARE:
    'nursing care medication administration vitals monitoring wound care chronic disease management diabetes blood pressure injections catheter',
  ELDERLY_ATTENDANT:
    'elderly attendant daily living assistance bathing dressing feeding mobility support companionship supervision',
  PHYSIOTHERAPY:
    'physiotherapy mobility recovery joint pain stiffness rehabilitation exercises balance training strength stroke recovery',
  POST_HOSPITAL_CARE:
    'post hospital care recovery after surgery discharge follow up intensive monitoring wound healing',
};

function buildCaregiverProfileText(caregiver) {
  const categories = (caregiver.categories || '').split(',').filter(Boolean);
  const keywordText = categories.map((c) => CATEGORY_KEYWORDS[c] || '').join(' ');
  return [caregiver.qualification, caregiver.bio, keywordText].filter(Boolean).join('. ');
}

module.exports = { analyzeSentiment, recommendCaregivers, buildCaregiverProfileText };
