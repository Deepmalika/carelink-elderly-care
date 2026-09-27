"""
Training data for the care-need triage classifier.

There's no real historical dataset of "family description -> correct service
category" to learn from, so this is a hand-curated set of example phrases per
category, written the way a family member might actually describe their
situation. It's intentionally varied in phrasing/length/formality so the
classifier learns the underlying vocabulary of each category rather than
memorizing a handful of templates.

Run `python train.py` after editing this file to retrain the model.
"""

NURSING_CARE = [
    "my mother needs her blood pressure checked daily and help with her insulin shots",
    "we need a nurse to change my father's wound dressing every day",
    "dad has a catheter that needs to be managed by a trained nurse",
    "looking for someone qualified to monitor my grandmother's diabetes and give her medication on time",
    "need daily vitals monitoring, she has a heart condition and we're worried",
    "my father needs an IV line managed at home after his treatment",
    "we need a registered nurse to handle mom's medication schedule, she's on several prescriptions",
    "grandpa needs his blood sugar monitored multiple times a day",
    "she has a chronic illness and needs regular check ups on her vitals at home",
    "need someone to administer injections and monitor for side effects",
    "my mother in law needs wound care after a small surgery on her leg",
    "father needs help managing his medications, he has kidney issues",
    "we need skilled nursing support for ongoing treatment at home",
    "she needs her oxygen levels and heart rate checked regularly",
    "looking for a nurse who can handle tube feeding for my father",
    "mom needs her stoma bag changed and monitored by a nurse",
    "need someone experienced with managing multiple chronic conditions and prescriptions",
    "grandmother needs regular checkups, she has high blood pressure and diabetes",
    "father has a pressure sore that needs professional wound care",
    "need a nurse for daily health monitoring, not just companionship",
    "my aunt needs help with her catheter care and medication timing",
    "we need someone qualified to give injections at home twice a day",
    "she has early kidney failure and needs regular monitoring at home",
    "father needs nebulizer treatments and vitals checked daily",
    "looking for nursing care for ongoing management of a chronic heart condition",
]

ELDERLY_ATTENDANT = [
    "my grandmother just needs someone to sit with her and keep her company during the day",
    "we need help with daily tasks like bathing, dressing and eating for my father",
    "looking for someone to assist mom with her daily routine, she can't be left alone",
    "need a caretaker who can help dad move around the house safely",
    "grandpa needs supervision throughout the day, he tends to wander",
    "we want someone to help with cooking, light housekeeping and keeping an eye on mom",
    "need an attendant for overnight supervision, mom sometimes gets confused at night",
    "father needs help getting dressed and using the bathroom",
    "looking for companionship and basic daily assistance for my elderly aunt",
    "we need someone to accompany grandmother on walks and help with meals",
    "mom needs help getting in and out of bed and around the house",
    "need a caregiver for general assistance, nothing medical, just daily support",
    "father is lonely and needs someone around for company and light help",
    "grandmother needs help bathing and getting dressed every morning",
    "we need a 12 hour attendant to help dad with everyday activities",
    "looking for round the clock supervision since mom lives alone",
    "need someone to help feed and bathe my grandfather daily",
    "father needs assistance moving from his bed to his chair throughout the day",
    "we want a companion for mom who can also help around the house a little",
    "grandpa needs someone to remind him to eat and take walks",
    "need help with daily hygiene and basic mobility for an elderly relative",
    "looking for a live-in attendant to help with everyday elderly care needs",
    "mom just needs supervision and help with simple daily tasks, nothing medical",
    "need someone to keep an eye on dad and help him with meals during the day",
]

PHYSIOTHERAPY = [
    "my father is having trouble walking after his stroke and needs rehab exercises",
    "mom's knee is stiff and painful, we need physiotherapy sessions",
    "grandfather fell recently and needs help regaining his strength and balance",
    "need a physiotherapist for arthritis pain and joint stiffness",
    "father needs mobility exercises after being bedridden for weeks",
    "looking for physio sessions to help mom recover her strength in her legs",
    "grandmother has trouble balancing and we're worried about falls",
    "need help with rehabilitation exercises after dad's hip replacement",
    "mom's muscles have weakened and she needs guided exercises to rebuild strength",
    "father has chronic back pain and needs therapeutic exercises",
    "looking for someone to help grandfather practice walking again after his fall",
    "need physiotherapy for frozen shoulder and reduced range of motion",
    "mom needs exercises to improve her mobility after a long hospital stay",
    "father is recovering from a fracture and needs physical therapy",
    "grandmother has arthritis and needs regular joint mobility exercises",
    "need a physiotherapist to help with balance training to prevent falls",
    "dad needs guided stretching and strength exercises after his stroke",
    "mom struggles to climb stairs and needs mobility focused physiotherapy",
    "looking for rehab exercises to help regain movement after knee surgery",
    "father's leg muscles have weakened, needs physiotherapy to rebuild strength",
    "grandmother needs help with gait training after her fall last month",
    "need a physio for chronic joint pain management through exercise",
    "mom needs therapeutic exercises to recover mobility in her shoulder",
]

POST_HOSPITAL_CARE = [
    "my father was just discharged from the hospital after heart surgery and needs close monitoring",
    "mom came home after her hip replacement surgery and needs intensive care for the next few weeks",
    "grandfather just left the hospital after pneumonia treatment and needs recovery support",
    "need short term intensive care right after dad's surgery discharge",
    "mother is recovering at home after a major operation and needs close follow up",
    "father was hospitalized for a week and just came home, needs recovery monitoring",
    "grandmother had knee surgery and was just discharged, needs post op care",
    "need care for the first two weeks after mom's surgery while she recovers",
    "father just had a bypass surgery and came home, needs careful monitoring",
    "mom was discharged after a fall and hip surgery, needs recovery support at home",
    "looking for post hospital care after dad's abdominal surgery",
    "grandfather just got out of the ICU and needs close care at home",
    "need help managing recovery right after mom's operation, she just left the hospital",
    "father had surgery last week and was discharged, needs follow up care and monitoring",
    "mother just came home after a serious surgery and needs round the clock recovery care",
    "need intensive support for the first few weeks after grandmother's hospital discharge",
    "dad's surgery went well but he just got discharged and needs recovery monitoring",
    "looking for care right after hospital discharge following a cardiac procedure",
    "grandmother needs close monitoring the first week after her operation",
    "father needs recovery care after being discharged following his stroke treatment",
]

CATEGORY_EXAMPLES = {
    "NURSING_CARE": NURSING_CARE,
    "ELDERLY_ATTENDANT": ELDERLY_ATTENDANT,
    "PHYSIOTHERAPY": PHYSIOTHERAPY,
    "POST_HOSPITAL_CARE": POST_HOSPITAL_CARE,
}


def build_dataset():
    texts, labels = [], []
    for category, examples in CATEGORY_EXAMPLES.items():
        for ex in examples:
            texts.append(ex)
            labels.append(category)
    return texts, labels
