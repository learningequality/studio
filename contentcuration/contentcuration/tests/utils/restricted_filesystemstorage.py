from django.core.files.storage import FileSystemStorage


class RestrictedFileSystemStorage:
    """
    A wrapper around FileSystemStorage that is restricted to more closely match
    the behavior of S3Storage which is used in production. In particuler,
    it does not expose the `path` method, and opening files for writing
    is not allowed.
    This cannot be solved by just mocking the `path` method, because
    it is used by the `FileSystemStorage` class internally.
    """

    def __init__(self, *args, **kwargs):
        self._inner = FileSystemStorage(*args, **kwargs)

    def __getattr__(self, name):
        if name == "path":
            raise NotImplementedError(
                "The 'path' method is intentionally not available."
            )
        return getattr(self._inner, name)

    def open(self, name, mode="rb"):
        if "w" in mode:
            raise ValueError(
                "Opening files for writing will not be available in production."
            )
        return self._inner.open(name, mode)

    def __dir__(self):
        return [x for x in dir(self._inner) if x != "path"]
