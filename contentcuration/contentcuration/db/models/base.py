from django.db.models.base import Model


class TemporaryModel(Model):
    """
    Class to inherit for temporary model functionality, which results in TEMP TABLE's within the
    database.
    """
    class Meta:
        abstract = True
        managed = False
