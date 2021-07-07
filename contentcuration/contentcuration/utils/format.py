from __future__ import division

from django.utils.translation import gettext_lazy as _
from past.utils import old_div


def format_size(value):
    B = float(value)
    KB = float(1024)
    MB = float(KB ** 2)  # 1,048,576
    GB = float(KB ** 3)  # 1,073,741,824
    TB = float(KB ** 4)  # 1,099,511,627,776

    if B < KB:
        return '{0}'.format(B), _('B')
    if KB <= B < MB:
        return '{0:.2f}'.format(old_div(B, KB)), _('KB')
    if MB <= B < GB:
        return '{0:.2f}'.format(old_div(B, MB)), _('MB')
    if GB <= B < TB:
        return '{0:.2f}'.format(old_div(B, GB)), _('GB')
    if TB <= B:
        return '{0:.2f}'.format(old_div(B, TB)), _('TB')
