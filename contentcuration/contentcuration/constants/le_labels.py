"""
This module contains constants representing the id of the labels.
"""
from __future__ import unicode_literals

# Grade Level
UPPER_PRIMARY = "upperprimary"
SPECIALIZED_PROFESSIONAL_TRAINING = "6a256feb4d882f5d90b862f83e789166"
SECONDARY = "secondary"
GRADE_LEVEL = (UPPER_PRIMARY, SPECIALIZED_PROFESSIONAL_TRAINING, SECONDARY)

# Resource Type
GAME = "game"
BOOK = "book"
VIDEO = "video"
AUDIO = "audio"
RESOURCE_TYPE = (GAME, BOOK, VIDEO, AUDIO)

# Learning Activity
PLAY = "0aacea8079e044618e297efc2486594f"
READ = "bfbff1a273e1b9c84a2d3dfa4af948fd"
LISTEN = "363e0d138291774124d13c5d309f0e94"
WATCH = "e7e6184e49758c82ba7b601b1b90af09"
LEARNING_ACTIVITY = (PLAY, READ, LISTEN, WATCH)

# Accessibitility
HIGH_CONTRAST_DISPLAY = "d6bada40219e36b7654715d8c5553aa0"
SIGN_LANGUAGE_CAPTIONS = "signlanguage"
ACCESIBILITY = (HIGH_CONTRAST_DISPLAY, SIGN_LANGUAGE_CAPTIONS)

# Category
FOR_SCHOOL = "for_school"
NON_FORMAL = "nonformal"
BASIC_SKILLS = "basicskills"
MATH = "{}.math".format(FOR_SCHOOL)
SCIENCES = "{}.sciences".format(FOR_SCHOOL)
BIOLOGY = "{}.biology".format(SCIENCES)
CALCULUS = "{}.calculus".format(MATH)
ALGEBRA = "{}.algebra".format(MATH)
ROBOTICS = "{}.robotics".format(NON_FORMAL)
DIGITAL_LITERACY = "{}.digitalliteracy".format(BASIC_SKILLS)
CATEGORY = (
    FOR_SCHOOL,
    NON_FORMAL,
    BASIC_SKILLS,
    MATH,
    SCIENCES,
    BIOLOGY,
    CALCULUS,
    ALGEBRA,
    ROBOTICS,
    DIGITAL_LITERACY,
)

MATH_ARRAY = (MATH, CALCULUS, ALGEBRA)
