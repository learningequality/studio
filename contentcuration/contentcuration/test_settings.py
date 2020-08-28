from .not_production_settings import *  # noqa

DEBUG = True

WEBPACK_LOADER["DEFAULT"][  # noqa
    "LOADER_CLASS"
] = "contentcuration.tests.webpack_loader.TestWebpackLoader"

TEST_ENV = True
