from abc import ABC
from abc import abstractmethod


class BackendRequest(object):
    """ Class that should be inherited by specific backend for its requests"""
    pass


class BackendResponse(object):
    """ Class that should be inherited by specific backend for its responses"""
    pass


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
    def make_request(self, request) -> BackendResponse:
        """ Make a request based on "request" """
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
