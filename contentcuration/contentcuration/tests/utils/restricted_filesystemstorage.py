from django.core.files.storage import FileSystemStorage


class RestrictedFileSystemStorage:
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
