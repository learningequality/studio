from abc import ABC, abstractmethod
from builtins import NotImplementedError
from typing import Union, Dict


class Backend(ABC):
    """ An abstract base class for backend interfaces that also implements the singleton pattern """
    _instance = None

    def __new__(class_, *args, **kwargs):
        if not isinstance(class_._instance, class_):
            class_._instance = object.__new__(class_, *args, **kwargs)
        return class_._instance

    @abstractmethod
    def connect(self) -> None:
        """ Establishes a connection to the backend service. """
        pass

    @abstractmethod
    def make_request(self, url: str, params=None) -> Union[bytes, str, Dict]:
        """ Makes an HTTP request to a given URL using the specified method. """
        pass

    @abstractmethod
    def request(self) -> None:
        """ Blueprint for the request object. """
        pass

    @abstractmethod
    def response(self) -> None:
        """ Blueprint for the response object. """
        pass

    @classmethod
    def get_instance(cls) -> 'Backend':
        """ Returns existing instance, if not then create one. """
        return cls._instance if cls._instance else cls._create_instance()

    @classmethod
    def _create_instance(cls) -> 'Backend':
        """ Returns the instance after creating it. """
        raise NotImplementedError("Subclasses should implement the creation of instance")


class BackendFactory(ABC):
    @abstractmethod
    def create_backend(self) -> Backend:
        """ Create a Backend instance from the given backend. """
        pass


class Adapter:
    """
    Base class for adapters that interact with a backend interface.

    This class should be inherited by adapter classes that facilitate
    interaction with different backend implementations.
    """
    def __init__(self, backend: Backend) -> None:
        self.backend = backend

    def request(self):
        """ Forward the request to the chosen Backend """
        return self.backend.request()

    def response(self):
        """ Forward the response to the chosen Backend """
        return self.backend.response()
