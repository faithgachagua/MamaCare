"""What a mother can log, and which entries are warning signs.

Warning signs follow the WHO danger signs in pregnancy and after birth.
Have a clinician review this list before real mothers rely on it.
"""

URGENT = "urgent"  # go to a health facility now
WATCH = "watch"    # speak to a health worker soon
NONE = None

# key: (label, level)
PREGNANT = {
    "feeling_good": ("Feeling good", NONE),
    "nausea": ("Nausea", NONE),
    "fatigue": ("Tiredness", NONE),
    "headache": ("Headache", NONE),
    "back_pain": ("Back pain", NONE),
    "cramping": ("Mild cramping", NONE),
    "heartburn": ("Heartburn", NONE),
    "swelling_feet": ("Swollen feet or ankles", NONE),
    "constipation": ("Constipation", NONE),
    "vomiting_persistent": ("Vomiting that won’t stop", WATCH),
    "painful_urination": ("Pain when passing urine", WATCH),
    "low_mood": ("Low mood or worry that won’t lift", WATCH),
    "heavy_bleeding": ("Vaginal bleeding", URGENT),
    "severe_headache_vision": ("Severe headache or blurred vision", URGENT),
    "severe_abdominal_pain": ("Severe belly pain", URGENT),
    "reduced_movement": ("Baby moving less than usual", URGENT),
    "fever": ("Fever or chills", URGENT),
    "fluid_leak": ("Waters broke or fluid leaking", URGENT),
    "face_hand_swelling": ("Sudden swelling of face or hands", URGENT),
    "breathing_difficulty": ("Trouble breathing", URGENT),
    "convulsions": ("Fit or convulsions", URGENT),
}

POSTPARTUM = {
    "feeling_good": ("Feeling good", NONE),
    "fatigue": ("Tiredness", NONE),
    "cramping": ("Cramping as the womb shrinks", NONE),
    "sore_nipples": ("Sore nipples", NONE),
    "constipation": ("Constipation", NONE),
    "headache": ("Headache", NONE),
    "low_mood": ("Low mood or worry that won’t lift", WATCH),
    "painful_urination": ("Pain when passing urine", WATCH),
    "wound_problem": ("Stitches or wound red, sore or leaking", WATCH),
    "breast_problem": ("Hot, red or painful breast", WATCH),
    "foul_discharge": ("Foul-smelling discharge", WATCH),
    "heavy_bleeding": ("Heavy bleeding (soaking a pad in an hour)", URGENT),
    "severe_headache_vision": ("Severe headache or blurred vision", URGENT),
    "severe_abdominal_pain": ("Severe belly pain", URGENT),
    "fever": ("Fever or chills", URGENT),
    "chest_pain_breathless": ("Chest pain or trouble breathing", URGENT),
    "calf_pain_swelling": ("Painful, swollen or hot calf", URGENT),
    "convulsions": ("Fit or convulsions", URGENT),
    "thoughts_of_harm": ("Thoughts of harming myself or my baby", URGENT),
}

CATALOG = {"pregnant": PREGNANT, "postpartum": POSTPARTUM}


def options_for(stage: str) -> list[dict]:
    table = CATALOG.get(stage, PREGNANT)
    return [{"key": k, "label": label, "level": level} for k, (label, level) in table.items()]


def lookup(stage: str, key: str):
    """(label, level) for a symptom key, or None if it is not a known symptom."""
    return CATALOG.get(stage, PREGNANT).get(key)


# Measurements a mother can log. key: (label, unit, min, max)
VITALS = {
    "blood_pressure": ("Blood pressure", "mmHg", 50, 300),
    "weight": ("Weight", "kg", 25, 250),
    "temperature": ("Temperature", "°C", 30, 45),
}
