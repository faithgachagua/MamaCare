"""Routine childhood immunisation schedule used to build the baby's checklist.

Drawn from Kenya's KEPI routine schedule as commonly published. It is a DRAFT for a
clinician to confirm before real use: the Ministry of Health changes it (new vaccines,
county-specific ones), so check the current schedule at the clinic or in the Mother-Baby booklet.
"""

# (code, name, protects against, age in weeks the dose is due)
SCHEDULE: list[tuple[str, str, str, int]] = [
    ("bcg", "BCG", "Tuberculosis", 0),
    ("opv0", "Polio (OPV) birth dose", "Polio", 0),
    ("opv1", "Polio (OPV) 1", "Polio", 6),
    ("penta1", "Pentavalent 1", "Diphtheria, tetanus, whooping cough, hepatitis B, Hib", 6),
    ("pcv1", "Pneumococcal (PCV10) 1", "Pneumonia and meningitis", 6),
    ("rota1", "Rotavirus 1", "Severe diarrhoea", 6),
    ("opv2", "Polio (OPV) 2", "Polio", 10),
    ("penta2", "Pentavalent 2", "Diphtheria, tetanus, whooping cough, hepatitis B, Hib", 10),
    ("pcv2", "Pneumococcal (PCV10) 2", "Pneumonia and meningitis", 10),
    ("rota2", "Rotavirus 2", "Severe diarrhoea", 10),
    ("opv3", "Polio (OPV) 3", "Polio", 14),
    ("ipv", "Polio injection (IPV)", "Polio", 14),
    ("penta3", "Pentavalent 3", "Diphtheria, tetanus, whooping cough, hepatitis B, Hib", 14),
    ("pcv3", "Pneumococcal (PCV10) 3", "Pneumonia and meningitis", 14),
    ("vita1", "Vitamin A", "Eye problems and infections", 26),
    ("mr1", "Measles-Rubella 1", "Measles and rubella", 39),
    ("mr2", "Measles-Rubella 2", "Measles and rubella", 78),
]

CODES = {c for c, *_ in SCHEDULE}
GRACE_WEEKS = 2  # a dose is "due" from its week and "overdue" after this many more
SOON_WEEKS = 4   # shown as "coming up" this far ahead
