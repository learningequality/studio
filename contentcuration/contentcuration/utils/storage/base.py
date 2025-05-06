from django.core.files.storage import Storage as BaseStorage


class Storage(BaseStorage):
    def writeable(self):
        """
        :rtype: bool
        """
        return True

    def get_client(self):
        """
        :rtype: object
        """
        return None


class CompositeStorage(Storage):
    def __init__(self):
        self.backends = []

    def _get_writeable_backend(self):
        """
        :rtype: Storage
        """
        for backend in self.backends:
            if backend.writeable:
                return backend
        raise AssertionError("No writeable backend found")

    def _get_readable_backend(self, name):
        """
        :rtype: Storage
        """
        for backend in self.backends:
            if backend.exists(name):
                return backend
        raise FileNotFoundError("{} not found".format(name))

    def get_client(self):
        return self._get_writeable_backend().get_client()

    def open(self, name, mode='rb'):
        return self._get_readable_backend(name).open(name, mode)

    def save(self, name, content, max_length=None):
        return self._get_writeable_backend().save(name, content, max_length=max_length)

    def delete(self, name):
        self._get_writeable_backend().delete(name)

    def exists(self, name):
        try:
            self._get_readable_backend(name)
            return True
        except FileNotFoundError:
            return False

    def listdir(self, path):
        # This method was not implemented on GoogleCloudStorage to begin with
        raise NotImplementedError("listdir is not implemented for CompositeStorage")

    def size(self, name):
        return self._get_readable_backend(name).size(name)

    def url(self, name):
        return self._get_readable_backend(name).url(name)

    def get_accessed_time(self, name):
        return self._get_readable_backend(name).get_accessed_time(name)

    def get_created_time(self, name):
        return self._get_readable_backend(name).get_created_time(name)

    def get_modified_time(self, name):
        return self._get_readable_backend(name).get_modified_time(name)
