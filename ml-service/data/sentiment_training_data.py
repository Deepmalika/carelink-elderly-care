"""
Training data for the sentiment classifier used on booking rating comments and
care notes.

Three classes, not two — this matters here specifically because care notes are
often routine clinical text ("blood pressure was 130/85 today") that isn't
positive or negative, it's neutral. A model trained only on positive/negative
examples would be forced to misclassify neutral clinical notes as one or the
other. Including NEUTRAL examples lets it recognize plain factual text for
what it is.
"""

POSITIVE = [
    "excellent care, very professional and attentive throughout",
    "the caregiver was wonderful with my mother, so patient and kind",
    "highly recommend, she was so gentle and caring with dad",
    "fantastic experience, the nurse really put us at ease",
    "he was fantastic, showed up on time and was incredibly thorough",
    "amazing service, my grandmother felt so comfortable with her",
    "we are so grateful, the attendant went above and beyond",
    "very happy with the care provided, will book again",
    "she handled everything with so much compassion, thank you",
    "outstanding care, communicated clearly with our whole family",
    "the physiotherapist was excellent, dad is walking so much better now",
    "truly caring and skilled, exceeded our expectations",
    "wonderful experience from start to finish, very reassuring",
    "he was patient and kind, mom really warmed up to him quickly",
    "best caregiver we've had, extremely knowledgeable and gentle",
    "so pleased with the visit, everything was handled perfectly",
    "she was lovely, made my grandfather laugh and feel at ease",
    "great communication and genuinely caring attitude throughout",
    "very impressed, professional and warm at the same time",
    "wonderful attendant, very attentive to every little need",
    "grateful for such compassionate and thorough care",
    "he did a great job, mom is recovering faster than expected",
    "excellent bedside manner, very reassuring for the whole family",
    "delighted with the service, would highly recommend to others",
    "she was incredibly gentle and caring during a stressful time",
    "great visit today, very happy with how everything went",
    "wonderful visit, she handled everything with so much care",
    "such a lovely visit, thank you for taking such good care of him",
    "happy with today's visit, she was excellent as always",
    "really pleased with the visit, everything felt calm and well handled",
    # instructional-voice examples that still carry genuine positive sentiment,
    # so the model doesn't learn "imperative sentence = neutral" as a shortcut
    "please pass along our thanks, she has been wonderful with the reminders",
    "just wanted to say the caregiver has been great about reminding him to take his pills",
]

NEGATIVE = [
    "caregiver was late and seemed distracted the whole visit",
    "not satisfied at all, poor communication throughout",
    "my father complained about rough handling during the visit",
    "very disappointed, she left early without finishing the tasks",
    "he was rude to my mother and dismissive of her concerns",
    "unacceptable, missed the scheduled medication time entirely",
    "the attendant seemed uninterested and barely engaged with dad",
    "poor experience, showed up an hour late with no explanation",
    "not happy with the service, felt rushed and careless",
    "she was inattentive and didn't follow the care instructions",
    "disappointed with how unprofessional the visit felt",
    "he was careless with the equipment and it worried us",
    "terrible communication, we had no idea what was happening",
    "very frustrated, the caregiver ignored our questions completely",
    "unhappy with the visit, mom felt neglected the whole time",
    "not what we expected, the attendant was cold and impatient",
    "concerning behavior, seemed unprepared for basic tasks",
    "we will not be booking again, extremely poor experience",
    "he was dismissive when we raised concerns about care",
    "disorganized visit, forgot key parts of the care plan",
    "my grandmother was uncomfortable with how rough he was",
    "very poor attitude, made the whole visit stressful",
    "she showed up unprepared and seemed to not know the care plan",
    "worrying lack of attention to dad's actual needs",
    "not satisfied, felt like a rushed and impersonal visit",
    # instructional-voice examples describing a real recurring problem, so the
    # model keeps recognizing genuine complaints even when phrased as an
    # instruction rather than a straightforward review
    "please make sure she actually takes her medication this time, it was missed again",
    "ensure she takes her meds on time, it was missed last time",
    "pls make sure he takes his meds and goes to his appointment on time, he missed it last time",
    "can someone please remind him properly, he missed his appointment again because no one reminded him",
]

NEUTRAL = [
    "patient's blood pressure was 130 over 85 today",
    "completed morning routine, no issues to report",
    "administered medication as scheduled at 9am",
    "patient rested for two hours in the afternoon",
    "checked vitals, all readings within normal range",
    "assisted with bathing and dressing this morning",
    "patient ate breakfast and lunch as usual",
    "performed wound dressing change, healing progressing normally",
    "patient walked ten minutes with assistance today",
    "recorded blood sugar level before lunch, 110 mg/dl",
    "helped patient with physiotherapy exercises for thirty minutes",
    "patient slept well through the night according to family",
    "changed catheter bag and recorded output",
    "patient took prescribed medication without any issues",
    "monitored oxygen levels throughout the visit, stable",
    "assisted with mobility exercises as per care plan",
    "patient had lunch and took an afternoon nap",
    "recorded temperature and pulse, both within normal limits",
    "completed scheduled physiotherapy session as planned",
    "patient was cooperative during the morning care routine",
    "gave scheduled insulin dose and recorded blood sugar",
    "reviewed care plan with family, no changes needed",
    "patient participated in light stretching exercises today",
    "checked in on patient twice during the shift, stable",
    "updated medication chart after evening dose",
    # --- instructional / reminder / logistics cluster -----------------------
    # Family members and coordinators routinely leave forward-looking notes
    # like these. They are routine coordination, not evaluative feedback, so
    # they belong in NEUTRAL rather than being pulled toward POSITIVE or
    # NEGATIVE purely on shared vocabulary with those classes.
    "remind her to take her medication on time",
    "please remind him to take his blood pressure tablets after breakfast",
    "she has a doctors appointment so remind her",
    "he has a dentist appointment on friday, please remind him beforehand",
    "please check on her around lunchtime today",
    "her appointment is at 3pm, please make sure she is ready",
    "remind him to drink more water throughout the day",
    "please make sure she takes her medication with food",
    "let her know the physiotherapist is coming tomorrow morning",
    "please remind mom to charge her hearing aids tonight",
    "make sure he brings his glasses to the appointment",
    "remind her to do her breathing exercises before bed",
    "please confirm the appointment time with the clinic",
    "let us know if the appointment needs to be rescheduled",
    "remind him about his follow-up appointment next week",
    "please make sure she wears her compression socks today",
    "can you remind her to call her sister this evening",
    "please prep her bag for tomorrow's appointment",
    "remind him to take his inhaler before the walk",
    "make sure she has her medication list ready for the appointment",
    "please note her next appointment is on tuesday",
    "remind her to eat something before taking the tablets",
    "let him know the caregiver will arrive a bit earlier tomorrow",
    "please remind her to bring her insurance card to the appointment",
    "yess no worries, she completed her appointment properly",
]

CATEGORY_EXAMPLES = {
    "POSITIVE": POSITIVE,
    "NEGATIVE": NEGATIVE,
    "NEUTRAL": NEUTRAL,
}


def build_dataset():
    texts, labels = [], []
    for label, examples in CATEGORY_EXAMPLES.items():
        for ex in examples:
            texts.append(ex)
            labels.append(label)
    return texts, labels
