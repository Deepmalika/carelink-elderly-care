# CareLink ML Service

Three small, independently trained/computed ML features backing CareLink's AI functionality.

## 1. Care-need triage classifier

Predicts which CareLink service category (Nursing Care, Elderly Attendant, Physiotherapy,
Post-Hospital Care) best matches a family's free-text description of their elderly relative's
situation. TF-IDF + Logistic Regression, trained on ~90 hand-curated examples
(`data/training_data.py`). ~92% cross-validation accuracy.

- Train: `python train.py` → saves `model/triage_pipeline.joblib`
- Endpoint: `POST /predict` — body `{ "description": "..." }`

## 2. Sentiment classifier

Scores booking rating comments and care notes as POSITIVE / NEGATIVE / NEUTRAL. Same
TF-IDF + Logistic Regression approach, trained on ~75 examples (`data/sentiment_training_data.py`)
that deliberately include routine clinical notes ("blood pressure was 130/85") as NEUTRAL, so the
model doesn't mistake ordinary care documentation for negative sentiment.

- Train: `python train_sentiment.py` → saves `model/sentiment_pipeline.joblib`
- Endpoint: `POST /analyze-sentiment` — body `{ "text": "..." }`

## 3. Caregiver recommendation engine

Ranks a set of verified caregivers for a specific patient. No offline training — it's computed
fresh per request: TF-IDF + cosine similarity between the patient's described needs and each
caregiver's profile text (qualification + bio + category-relevant keywords, added by the backend
to bridge vocabulary gaps between clinical language and caregiver bios), blended with the
caregiver's rating (25% weight) and years of experience (20% weight, capped at 10 years).

- Endpoint: `POST /recommend-caregivers` — body `{ "patientText": "...", "caregivers": [...] }`
- No training step; nothing to persist, so no model file for this one.

None of these are medical diagnosis tools — they're routing, matching, and monitoring aids only.

## Setup

```bash
cd ml-service
python3 -m venv venv          # optional but recommended
source venv/bin/activate       # on Windows: venv\Scripts\activate
pip install -r requirements.txt
python train.py                # trains the triage model
python train_sentiment.py       # trains the sentiment model
uvicorn app:app --host 0.0.0.0 --port 8001 --reload
```

The service runs on **http://localhost:8001**. The Node backend calls it at the URL set in
`backend/.env` as `ML_SERVICE_URL` (defaults to `http://localhost:8001`).

## Endpoints

- `GET /health` — `{ "status": "ok", "modelLoaded": true, "sentimentModelLoaded": true }`
- `POST /predict` — triage classifier (see above)
- `POST /analyze-sentiment` — sentiment classifier (see above)
- `POST /recommend-caregivers` — caregiver ranking (see above)

## Retraining / improving the models

Edit `data/training_data.py` (triage) or `data/sentiment_training_data.py` (sentiment) to add
more example phrases, then rerun the matching `train*.py` script — it prints cross-validation
accuracy so you can see whether your changes helped before it overwrites the saved model.

If you eventually collect real usage data (actual descriptions/reviews and which category or
sentiment they turned out to be), that's a much stronger training set than the synthetic
examples here — swap the relevant `build_dataset()` function to pull from your own logged data.

The recommendation engine has no training data to edit — its quality depends on the category
keyword vocabulary in `backend/src/utils/ml.js` (`CATEGORY_KEYWORDS`) and on caregivers writing
a real bio. Add more domain vocabulary there if you notice weak matches for a given category.
