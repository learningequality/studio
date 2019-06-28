from .test_settings import *  # noqa

DEBUG = False

MIDDLEWARE_CLASSES = ('whitenoise.middleware.WhiteNoiseMiddleware',) + MIDDLEWARE_CLASSES  # noqa
