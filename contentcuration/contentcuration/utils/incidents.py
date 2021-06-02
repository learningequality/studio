from django.utils.translation import gettext_lazy as _

INCIDENTS = {
    # General message to display when readonly mode is off
    "default": {
        "readonly": False,
        "message": _("There was a problem with a third-party service. "
                     "This means certain operations might be blocked. "
                     "We appreciate your patience while these issues "
                     "are being resolved.")
    },

    # General message to display when readonly mode is turned on
    "readonly": {
        "readonly": True,
        "message": _("<b>EMERGENCY MAINTENANCE</b> Kolibri Studio is "
                     "operating on read-only mode for the time being in "
                     "order for us to resolve some maintenance issues. "
                     "This means all editing capabilities are disabled "
                     "at the moment. We're currently working very hard "
                     "to fix the issue as soon as possible. If you have "
                     "any questions please contact us at "
                     "content@learningequality.org. We apologize for any "
                     "inconvenience caused and appreciate your patience "
                     "while we resolve these issues.")
    },

    # Our database has crashed
    "database": {
        "readonly": True,
        "message": _("<b>EMERGENCY MAINTENANCE</b> Kolibri Studio is "
                     "operating on read-only mode for the time being in "
                     "order for us to resolve some database issues. "
                     "This means all editing capabilities are disabled "
                     "at the moment. We're currently working very hard "
                     "to fix the issue as soon as possible. If you have "
                     "any questions please contact us at "
                     "content@learningequality.org. We apologize for any "
                     "inconvenience caused and appreciate your patience "
                     "while we resolve these issues.")
    },

    # Google Cloud Storage is down (used for file storage)
    "google_cloud_storage": {
        "readonly": False,
        "message": _("We are encountering issues with Google Cloud Storage. "
                     "This means any file uploading and publishing operations "
                     "are currently unavailable. We appreciate your patience "
                     "while these issues are being resolved. To check the status "
                     "of this service, please visit <a target='_blank' href='"
                     "https://status.cloud.google.com/'>here</a>")
    },

    # Redis is down (used for celery tasks like publishing)
    "redis": {
        "readonly": False,
        "message": _("We are encountering issues with a third-party service. "
                     "This means publishing is currently unavailable. We appreciate "
                     "your patience while these issues are being resolved.")
    },

    # Kubernetes is down (used for hosting Studio)
    "kubernetes": {
        "readonly": False,
        "message": _("We are encountering issues with our data center. "
                     "This means you may encounter networking problems "
                     "while using Studio. We appreciate your patience "
                     "while these issues are being resolved. To check "
                     "the status of this service, please visit <a target='_blank'"
                     " href='https://status.cloud.google.com/'>here</a>")
    }
}
