from functools import reduce


def q_any(q_list):
    """
    OR's a list of Q filters

    :param q_list: A django.db.models.Q
    :return: Another Q
    """
    if not q_list:
        return []

    return reduce((lambda q1, q2: q1 | q2), q_list) if len(q_list) > 1 else q_list[0]


def q_all(q_list):
    """
    AND's a list of Q filters

    :param q_list: A django.db.models.Q
    :return: Another Q
    """
    if not q_list:
        return []

    return reduce((lambda q1, q2: q1 & q2), q_list) if len(q_list) > 1 else q_list[0]
