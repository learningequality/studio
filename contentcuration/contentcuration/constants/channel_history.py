from django.utils.translation import ugettext_lazy as _

CREATION = "creation"
PUBLICATION = "publication"
DELETION = "deletion"
RECOVERY = "recovery"

choices = (
    (CREATION, _("Creation")),
    (PUBLICATION, _("Publication")),
    (DELETION, _("Deletion")),
    (RECOVERY, _("Deletion recovery")),
)
