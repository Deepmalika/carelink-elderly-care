"""
Trains a text classifier that maps a family's free-text description of their
elderly relative's situation to one of the four CareLink service categories.

Approach: TF-IDF vectorization + a Logistic Regression classifier (one-vs-rest).
This is a small, fast, fully interpretable model — a good fit for a
few-hundred-example dataset like this one, where a larger deep learning model
would just overfit.

Usage: python train.py
Produces: model/triage_pipeline.joblib
"""
import os
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.model_selection import cross_val_score, StratifiedKFold

from data.training_data import build_dataset

MODEL_DIR = os.path.join(os.path.dirname(__file__), "model")
MODEL_PATH = os.path.join(MODEL_DIR, "triage_pipeline.joblib")


def main():
    texts, labels = build_dataset()
    print(f"Training on {len(texts)} examples across {len(set(labels))} categories.")

    pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(
            ngram_range=(1, 2),
            stop_words="english",
            min_df=1,
            sublinear_tf=True,
        )),
        ("clf", LogisticRegression(max_iter=1000, C=5.0)),
    ])

    # 5-fold cross-validation to sanity-check the model generalizes reasonably
    # well before we ship it, given how small this dataset is.
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    scores = cross_val_score(pipeline, texts, labels, cv=cv)
    print(f"Cross-validation accuracy: {scores.mean():.2%} (+/- {scores.std():.2%})")

    pipeline.fit(texts, labels)

    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(pipeline, MODEL_PATH)
    print(f"Saved trained model to {MODEL_PATH}")


if __name__ == "__main__":
    main()
