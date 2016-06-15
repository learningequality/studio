"""
This module contains constants representing the kinds of ContentKind.
"""
from django.utils.translation import ugettext_lazy as _

# constants for Licenses
CC_BY = "CC-BY"
CC_BY_SA = "CC BY-SA"
CC_BY_ND = "CC BY-ND"
CC_BY_NC = "CC BY-NC"
CC_BY_NC_SA = "CC BY-NC-SA"
CC_BY_NC_ND = "CC BY-NC-ND"
ARRD = "All rights reserved"

choices = (
    (CC_BY, _("CC-BY")),
    (CC_BY_SA, _("CC BY-SA")),
    (CC_BY_ND, _("CC BY-ND")),
    (CC_BY_NC, _("CC BY-NC")),
    (CC_BY_NC_SA, _("CC BY-NC-SA")),
    (CC_BY_NC_ND, _("CC BY-NC-ND")),
    (ARRD, _("All rights reserved")),
)
