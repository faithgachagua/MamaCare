"""Reference content for the journey screens.

General guidance only, based on WHO recommendations. A clinician should review
it, and a mother's own clinic schedule always comes first.
"""
from bisect import bisect_right

# week: (length_cm, weight_g, what is happening). Between anchors the size is interpolated.
_ANCHORS = {
    4: (0.1, 0.0, "A tiny ball of cells settles into the lining of the womb."),
    8: (1.6, 1, "All the main organs have started to form and the heart is beating."),
    12: (5.4, 14, "Fingers and toes are separate and baby’s reflexes are starting."),
    16: (12, 100, "Baby can make facial expressions. You may soon feel the first flutters."),
    20: (25, 300, "You are about halfway. Baby is moving more and starting to hear."),
    24: (30, 600, "Baby’s hearing is developing and baby responds to loud sounds."),
    28: (37, 1000, "Baby’s eyes can open. The third trimester begins."),
    32: (42, 1700, "Bones are hardening and baby practises breathing movements."),
    36: (47, 2600, "Baby is filling out and may move down into your pelvis."),
    40: (51, 3400, "Full term is anywhere from 37 to 42 weeks."),
}
_WEEKS = sorted(_ANCHORS)


def baby_this_week(week: int) -> dict:
    week = max(4, min(40, week))
    i = bisect_right(_WEEKS, week) - 1
    w0 = _WEEKS[i]
    l0, g0, text = _ANCHORS[w0]
    if i + 1 < len(_WEEKS):
        w1 = _WEEKS[i + 1]
        l1, g1, _ = _ANCHORS[w1]
        t = (week - w0) / (w1 - w0)
        length, grams = l0 + (l1 - l0) * t, g0 + (g1 - g0) * t
    else:
        length, grams = l0, g0
    return {"length_cm": round(length, 1), "weight_g": int(round(grams, -1)) if grams >= 100 else int(round(grams)), "text": text}


def trimester(week: int) -> int:
    return 1 if week < 14 else 2 if week < 28 else 3


# Antenatal contacts recommended by WHO (2016): week, what usually happens.
ANTENATAL_CONTACTS = [
    (12, "First visit: booking, blood tests and checks"),
    (20, "Check-up. Many clinics offer a detailed scan around now"),
    (26, "Check-up. A glucose test is often done between 24 and 28 weeks"),
    (30, "Check-up"),
    (34, "Check-up"),
    (36, "Check-up. Confirm where you will deliver and how you will get there"),
    (38, "Check-up"),
    (40, "Check-up"),
]

# Weeks after birth. Mother and baby are checked within the first days, then at six weeks.
POSTNATAL_CONTACTS = [
    (0, "Check-up in the first 24 hours after birth", "Mother and baby"),
    (1, "Check-up around day 3 and again between days 7 and 14", "Mother and baby"),
    (6, "Six-week postnatal check, including a talk about family planning", "Mother"),
    (6, "First immunisations are due at 6 weeks. Bring the child health card", "Baby"),
]

NUTRITION = {
    "pregnant": [
        ("Iron", "Beans, lentils, meat, fish (omena) and dark leafy greens like sukuma wiki. Take iron and folic acid tablets as your clinic advises."),
        ("Calcium", "Milk, yoghurt, or fortified porridge each day help build baby’s bones."),
        ("Water", "Drink water through the day, more when it is hot or you are on your feet a lot."),
    ],
    "postpartum": [
        ("Iron", "Beans, lentils, meat and dark leafy greens help rebuild what you lost at birth."),
        ("Protein and energy", "Eat regular meals with protein, such as eggs, fish, beans or milk. Breastfeeding needs extra energy."),
        ("Water", "Keep a drink beside you when you feed or rest. Breastfeeding makes you thirsty."),
    ],
}
