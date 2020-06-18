from .not_production_settings import *  # noqa

MIDDLEWARE = ("whitenoise.middleware.WhiteNoiseMiddleware",) + MIDDLEWARE  # noqa
