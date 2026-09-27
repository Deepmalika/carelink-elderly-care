"""
CareLink ML service — three features:
  1. POST /predict              — care-need triage classifier
  2. POST /analyze-sentiment    — sentiment classifier for reviews/care notes
  3. POST /recommend-caregivers — content-based caregiver ranking for a patient

This is a routing/matching aid, not a medical diagnosis tool: it never
assesses severity or gives clinical advice, it only maps everyday language
to the platform's existing service categories.

Run: uvicorn app:app --host 0.0.0.0 --port 8001 --reload
"""
import os
import joblib
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

MODEL_PATH = os.path.join(os.path.dirname(__file__), "model", "triage_pipeline.joblib")
SENTIMENT_MODEL_PATH = os.path.join(os.path.dirname(__file__), "model", "sentiment_pipeline.joblib")

CATEGORY_INFO = {
    "NURSING_CARE": {
        "label": "Nursing Care",
        "reason": "This sounds like it involves clinical tasks (medication, vitals, wound care) best handled by a registered nurse.",
    },
    "ELDERLY_ATTENDANT": {
        "label": "Elderly Attendant",
        "reason": "This sounds like day-to-day living support and companionship rather than a medical need.",
    },
    "PHYSIOTHERAPY": {
        "label": "Physiotherapy",
        "reason": "This sounds like a mobility, strength, or rehabilitation need best supported by a physiotherapist.",
    },
    "POST_HOSPITAL_CARE": {
        "label": "Post-Hospital Care",
        "reason": "This sounds like recovery support right after a hospital stay or surgery.",
    },
}

app = FastAPI(title="CareLink Triage ML Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # the Node backend is the only intended caller; tighten this in production
    allow_methods=["*"],
    allow_headers=["*"],
)

_model = None
_sentiment_model = None


def get_model():
    global _model
    if _model is None:
        if not os.path.exists(MODEL_PATH):
            raise RuntimeError(
                f"No trained model found at {MODEL_PATH}. Run `python train.py` first."
            )
        _model = joblib.load(MODEL_PATH)
    return _model


def get_sentiment_model():
    global _sentiment_model
    if _sentiment_model is None:
        if not os.path.exists(SENTIMENT_MODEL_PATH):
            raise RuntimeError(
                f"No trained model found at {SENTIMENT_MODEL_PATH}. Run `python train_sentiment.py` first."
            )
        _sentiment_model = joblib.load(SENTIMENT_MODEL_PATH)
    return _sentiment_model


class TriageRequest(BaseModel):
    description: str = Field(..., min_length=3, max_length=2000)


class CategoryScore(BaseModel):
    category: str
    label: str
    confidence: float


class TriageResponse(BaseModel):
    topCategory: str
    topLabel: str
    confidence: float
    reason: str
    allScores: list[CategoryScore]
    lowConfidence: bool


@app.get("/health")
def health():
    return {
        "status": "ok",
        "modelLoaded": os.path.exists(MODEL_PATH),
        "sentimentModelLoaded": os.path.exists(SENTIMENT_MODEL_PATH),
    }


@app.post("/predict", response_model=TriageResponse)
def predict(req: TriageRequest):
    model = get_model()
    text = req.description.strip()
    if not text:
        raise HTTPException(status_code=400, detail="description must not be empty.")

    probabilities = model.predict_proba([text])[0]
    classes = model.classes_

    scored = sorted(zip(classes, probabilities), key=lambda x: x[1], reverse=True)
    top_category, top_confidence = scored[0]

    return TriageResponse(
        topCategory=top_category,
        topLabel=CATEGORY_INFO[top_category]["label"],
        confidence=round(float(top_confidence), 4),
        reason=CATEGORY_INFO[top_category]["reason"],
        allScores=[
            CategoryScore(category=cat, label=CATEGORY_INFO[cat]["label"], confidence=round(float(p), 4))
            for cat, p in scored
        ],
        # Below ~45% confidence the top guess isn't reliably better than a coin flip
        # across 4 classes (25% baseline) — flag it so the UI can suggest browsing manually.
        lowConfidence=bool(top_confidence < 0.45),
    )


# --- Sentiment analysis -----------------------------------------------------

SENTIMENT_LABELS = {
    "POSITIVE": "Positive",
    "NEGATIVE": "Negative",
    "NEUTRAL": "Neutral",
}


class SentimentRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=2000)


class SentimentResponse(BaseModel):
    label: str
    displayLabel: str
    confidence: float
    scores: dict[str, float]
    flagged: bool


@app.post("/analyze-sentiment", response_model=SentimentResponse)
def analyze_sentiment(req: SentimentRequest):
    model = get_sentiment_model()
    text = req.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="text must not be empty.")

    probabilities = model.predict_proba([text])[0]
    classes = model.classes_
    scores = {cls: round(float(p), 4) for cls, p in zip(classes, probabilities)}
    top_label = max(scores, key=scores.get)
    top_confidence = scores[top_label]

    return SentimentResponse(
        label=top_label,
        displayLabel=SENTIMENT_LABELS[top_label],
        confidence=top_confidence,
        scores=scores,
        # Flag for admin attention when negative sentiment is the model's confident top call.
        flagged=bool(top_label == "NEGATIVE" and top_confidence >= 0.45),
    )


# --- Caregiver recommendation -----------------------------------------------
#
# Content-based matching: TF-IDF + cosine similarity between the patient's
# described needs and each candidate caregiver's profile text (bio +
# qualification), blended with normalized rating and experience. This is
# computed fresh per request (no persisted model needed) since it depends on
# whichever caregivers the backend passes in as candidates.

TEXT_SIMILARITY_WEIGHT = 0.55
RATING_WEIGHT = 0.25
EXPERIENCE_WEIGHT = 0.20
EXPERIENCE_CAP_YEARS = 10


class CaregiverCandidate(BaseModel):
    id: str
    profileText: str
    ratingAverage: float = 0
    ratingCount: int = 0
    experienceYears: int = 0


class RecommendRequest(BaseModel):
    patientText: str = Field(..., min_length=1, max_length=2000)
    caregivers: list[CaregiverCandidate]


class CaregiverRecommendation(BaseModel):
    id: str
    score: float
    textSimilarity: float
    reasons: list[str]


class RecommendResponse(BaseModel):
    recommendations: list[CaregiverRecommendation]


@app.post("/recommend-caregivers", response_model=RecommendResponse)
def recommend_caregivers(req: RecommendRequest):
    if not req.caregivers:
        return RecommendResponse(recommendations=[])

    patient_text = req.patientText.strip() or "general elderly care"
    corpus = [patient_text] + [c.profileText or "general caregiving experience" for c in req.caregivers]

    vectorizer = TfidfVectorizer(ngram_range=(1, 2), stop_words="english")
    tfidf = vectorizer.fit_transform(corpus)
    similarities = cosine_similarity(tfidf[0:1], tfidf[1:]).flatten()

    results = []
    for caregiver, similarity in zip(req.caregivers, similarities):
        rating_component = (caregiver.ratingAverage / 5) if caregiver.ratingCount > 0 else 0.6
        experience_component = min(caregiver.experienceYears / EXPERIENCE_CAP_YEARS, 1.0)

        score = (
            TEXT_SIMILARITY_WEIGHT * similarity
            + RATING_WEIGHT * rating_component
            + EXPERIENCE_WEIGHT * experience_component
        )

        reasons = []
        if similarity >= 0.08:
            reasons.append("Their profile closely matches what you described")
        if caregiver.ratingCount >= 1 and caregiver.ratingAverage >= 4.5:
            reasons.append("Highly rated by other families")
        if caregiver.experienceYears >= 5:
            reasons.append(f"{caregiver.experienceYears} years of experience")
        if not reasons:
            reasons.append("Verified and available for this category")

        results.append(CaregiverRecommendation(
            id=caregiver.id,
            score=round(float(score), 4),
            textSimilarity=round(float(similarity), 4),
            reasons=reasons,
        ))

    results.sort(key=lambda r: r.score, reverse=True)
    return RecommendResponse(recommendations=results)
