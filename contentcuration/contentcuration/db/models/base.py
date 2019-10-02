from django.db.models.base import Model


class TemporaryModel(Model):
    class Meta:
        abstract = True
        managed = False
