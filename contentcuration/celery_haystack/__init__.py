__version__ = '0.10'


def version_hook(config):
    config['metadata']['version'] = __version__


default_app_config = 'celery_haystack.apps.Celery_haystackConfig'

                            
