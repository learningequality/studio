from django.conf import settings


def site_variables(request):
    return {'INCIDENT': settings.INCIDENT}
