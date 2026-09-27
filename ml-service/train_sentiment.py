"""
Trains a sentiment classifier (POSITIVE / NEGATIVE / NEUTRAL) for booking
rating comments and care notes. Same approach as the triage classifier:
TF-IDF + Logistic Regression, trained on a small hand-curated dataset — see
data/sentiment_training_data.py.

Usage: python train_sentiment.py
Produces: model/sentiment_pipeline.joblib
"""
import os
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.model_selection import cross_val_score, StratifiedKFold

from data.sentiment_training_data import build_dataset

MODEL_DIR = os.path.join(os.path.dirname(__file__), "model")
MODEL_PATH = os.path.join(MODEL_DIR, "sentiment_pipeline.joblib")


def main():
    texts, labels = build_dataset()
    print(f"Training on {len(texts)} examples across {len(set(labels))} classes.")

    pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(
            ngram_range=(1, 2),
            stop_words="english",
            min_df=1,
            sublinear_tf=True,
        )),
        ("clf", LogisticRegression(max_iter=1000, C=5.0)),
    ])

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    scores = cross_val_score(pipeline, texts, labels, cv=cv)
    print(f"Cross-validation accuracy: {scores.mean():.2%} (+/- {scores.std():.2%})")

    pipeline.fit(texts, labels)

    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(pipeline, MODEL_PATH)
    print(f"Saved trained model to {MODEL_PATH}")


if __name__ == "__main__":
    main()
