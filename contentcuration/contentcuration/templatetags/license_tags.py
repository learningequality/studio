from django import template
from django.template.defaultfilters import stringfilter
from django.utils.translation import gettext_lazy as _

from contentcuration.models import License

register = template.Library()

LICENSE_MAPPING = None

DESCRIPTION_MAPPING = {"CC BY": _("The Attribution License lets others distribute, "
                                  "remix, tweak, and build upon your work, even commercially, "
                                  "as long as they credit you for the original creation. This "
                                  "is the most accommodating of licenses offered. Recommended "
                                  "for maximum dissemination and use of licensed materials."),
                       "CC BY-SA": _("The Attribution-ShareAlike License lets others remix,"
                                     " tweak, and build upon your work even for commercial purposes,"
                                     " as long as they credit you and license their new creations "
                                     "under the identical terms. This license is often compared to "
                                     "\"copyleft\" free and open source software licenses. All new "
                                     "works based on yours will carry the same license, so any "
                                     "derivatives will also allow commercial use. This is the "
                                     "license used by Wikipedia, and is recommended for materials "
                                     "that would benefit from incorporating content from Wikipedia "
                                     "and similarly licensed projects."),
                       "CC BY-ND": _("The Attribution-NoDerivs License allows for redistribution,"
                                     " commercial and non-commercial, as long as it is passed along "
                                     "unchanged and in whole, with credit to you."),
                       "CC BY-NC": _("The Attribution-NonCommercial License lets others remix, "
                                     "tweak, and build upon your work non-commercially, and although "
                                     "their new works must also acknowledge you and be non-commercial, "
                                     "they don't have to license their derivative works on the same terms."),
                       "CC BY-NC-SA": _("The Attribution-NonCommercial-ShareAlike License lets "
                                        "others remix, tweak, and build upon your work non-commercially, "
                                        "as long as they credit you and license their new creations under "
                                        "the identical terms."),
                       "CC BY-NC-ND": _("The Attribution-NonCommercial-NoDerivs License is the "
                                        "most restrictive of our six main licenses, only allowing others "
                                        "to download your works and share them with others as long as they "
                                        "credit you, but they can't change them in any way or use them commercially."),
                       "All Rights Reserved": _("The All Rights Reserved License indicates that "
                                                "the copyright holder reserves, or holds for their own use, all "
                                                "the rights provided by copyright law under one specific copyright treaty."),
                       "Public Domain": _("Public Domain work has been identified as being free "
                                          "of known restrictions under copyright law, including all related "
                                          "and neighboring rights."),
                       "Special Permissions": _("Special Permissions is a custom license to use"
                                                " when the current licenses do not apply to the content. The "
                                                "owner of this license is responsible for creating a description "
                                                "of what this license entails."),
                       }


@register.filter(is_safe=True)
@stringfilter
def get_license_url(value):
    global LICENSE_MAPPING
    if not LICENSE_MAPPING:
        LICENSE_MAPPING = {lic.license_name: lic.license_url for lic in License.objects.all()}

    return LICENSE_MAPPING.get(value)


@register.filter(is_safe=True)
@stringfilter
def get_license_description(value):
    return DESCRIPTION_MAPPING.get(value) or License.objects.get(license_name=value).description
