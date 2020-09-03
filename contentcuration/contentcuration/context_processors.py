from django.conf import settings


def site_variables(request):
    return {'INCIDENT': settings.INCIDENT,
            'BETA_MODE': settings.BETA_MODE,
            'DEPRECATED': "contentworkshop" in request.get_host(),
            'STORAGE_BASE_URL': "{bucket}/{storage_root}/".format(bucket=settings.AWS_S3_BUCKET_NAME, storage_root=settings.STORAGE_ROOT),
            'STORAGE_HOST': settings.AWS_S3_ENDPOINT_URL,
            'DEBUG': settings.DEBUG,
            'LOGGED_IN': not request.user.is_anonymous()}
