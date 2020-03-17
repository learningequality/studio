from .test_settings import *  # noqa

DEBUG = False

MIDDLEWARE = ('whitenoise.middleware.WhiteNoiseMiddleware',) + MIDDLEWARE  # noqa
