from django.utils.translation import ugettext_lazy as _

DELETION = "soft-deletion"
RECOVERY = "soft-recovery"
RELATED_DATA_HARD_DELETION = "related-data-hard-deletion"

choices = (
    (DELETION, _("User soft deletion")),
    (RECOVERY, _("User soft deletion recovery")),
    (RELATED_DATA_HARD_DELETION, _("User related data hard deletion")),
)
