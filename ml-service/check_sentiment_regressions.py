"""
Quick regression check for the sentiment model. Run this after every retrain
(python train_sentiment.py) to catch cases where new training data silently
flips the classification of an unrelated sentence — small hand-written
datasets are prone to this, as we've already hit twice (reminder/instruction
phrasing being misread as negative, then the word "visit" itself picking up
a spurious negative bias).

Usage:
    python check_sentiment_regressions.py

Add a case any time you find (or fix) a real misclassification, so it never
silently regresses again.
"""
import joblib

MODEL_PATH = "model/sentiment_pipeline.joblib"

# (text, expected_label) — expand this list over time as you find more edge cases.
CASES = [
    # Clear-cut sentiment, should always be easy
    ("she was wonderful and so caring with dad today", "POSITIVE"),
    ("caregiver showed up late and was rude to my mother", "NEGATIVE"),
    ("checked vitals, all readings within normal range", "NEUTRAL"),

    # Previously fixed: reminder/instruction-voice sentences wrongly read as
    # negative or positive just from surface word overlap ("medication", "time")
    ("remind her to take her medication on time", "NEUTRAL"),
    ("she has a doctors appointment so remind her", "NEUTRAL"),
    ("please make sure she actually takes her medication this time, it was missed again", "NEGATIVE"),

    # Previously fixed: the word "visit" had picked up a spurious negative
    # bias purely from class imbalance in the training data
    ("she was great and we're happy with the visit", "POSITIVE"),
    ("great visit, very happy with everything", "POSITIVE"),
    ("very disappointed with how the visit went, felt rushed", "NEGATIVE"),

    # A few more everyday phrasings worth keeping an eye on
    ("thank you so much, really appreciate the extra care today", "POSITIVE"),
    ("not happy with the service, felt rushed and careless", "NEGATIVE"),
    ("patient ate breakfast and lunch as usual", "NEUTRAL"),
]


def main():
    model = joblib.load(MODEL_PATH)

    print(f"{'expected':10s} {'predicted':10s} {'confidence':>10s}  text")
    passed = 0
    for text, expected in CASES:
        probs = model.predict_proba([text])[0]
        scores = dict(zip(model.classes_, probs))
        predicted = max(scores, key=scores.get)
        ok = predicted == expected
        passed += ok
        mark = "PASS" if ok else "FAIL"
        print(f"{expected:10s} {predicted:10s} {scores[predicted]:9.1%}  [{mark}] {text}")

    print(f"\n{passed}/{len(CASES)} passed.")
    if passed < len(CASES):
        print("Some cases regressed — review the training data changes you just made.")


if __name__ == "__main__":
    main()