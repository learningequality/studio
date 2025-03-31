from .settings import *  # noqa

ALLOWED_HOSTS = ["studio.local", "192.168.31.9", "127.0.0.1", "*"]

ACCOUNT_ACTIVATION_DAYS = 7
EMAIL_BACKEND = 'postmark.django_backend.EmailBackend'
POSTMARK_API_KEY = 'POSTMARK_API_TEST'
POSTMARK_TEST_MODE = True

SITE_ID = 2

# Allow the debug() context processor to add variables to template context.
# Include here the IPs from which a local dev server might be accessed. See
# https://docs.djangoproject.com/en/2.0/ref/settings/#internal-ips
INTERNAL_IPS = (
    "127.0.0.1",
    "studio.local",
    "192.168.31.9",
)

AWS_AUTO_CREATE_BUCKET = True

# Use local instance for curriculum automation for development
CURRICULUM_AUTOMATION_API_URL = "http://localhost:8000"
