from abc import ABC, abstractmethod


class BackendRequest:
    """Class that should be inherited by specific backend for its requests."""
    pass


class BackendResponse:
    """Class that should be inherited by specific backend for its responses."""
    pass


class Backend(ABC):
    """An abstract base class for backend interfaces that also implements the singleton pattern."""
    _instance = None

    def __new__(cls, *args, **kwargs):
        if not isinstance(cls._instance, cls):
            cls._instance = super().__new__(cls)
        return cls._instance

    @abstractmethod
    def connect(self) -> None:
        """Establishes a connection to the backend service."""
        pass

    @abstractmethod
    def make_request(self, request: BackendRequest) -> BackendResponse:
        """Processes a request and returns a response."""
        pass

    @classmethod
    def get_instance(cls) -> 'Backend':
        """Returns the existing instance, or creates one if it does not exist."""
        if cls._instance is None:
            cls._instance = cls._create_instance()
        return cls._instance

    @classmethod
    @abstractmethod
    def _create_instance(cls) -> 'Backend':
        """Creates an instance of the backend."""
        pass


class ConcreteBackend(Backend):
    """A concrete implementation of the Backend abstract class."""

    def connect(self) -> None:
        """Establishes a connection (mock implementation)."""
        print("Connected to ConcreteBackend.")

    def make_request(self, request: BackendRequest) -> BackendResponse:
        """Handles the request and returns a response (mock implementation)."""
        print(f"Processing request: {request}")
        return BackendResponse()

    @classmethod
    def _create_instance(cls) -> 'Backend':
        """Creates an instance of the concrete backend."""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance


class BackendFactory(ABC):
    """Abstract factory for creating Backend instances."""

    @abstractmethod
    def create_backend(self) -> Backend:
        """Creates and returns a Backend instance."""
        pass


class ConcreteBackendFactory(BackendFactory):
    """A factory class to create instances of ConcreteBackend."""

    def create_backend(self) -> Backend:
        return ConcreteBackend.get_instance()


class Adapter:
    """
    Base class for adapters that interact with a backend interface.

    This class should be inherited by adapter classes that facilitate
    interaction with different backend implementations.
    """

    def __init__(self, backend: Backend) -> None:
        self.backend = backend


# Running the implementation
if __name__ == "__main__":
    factory = ConcreteBackendFactory()
    backend = factory.create_backend()

    adapter = Adapter(backend)
    backend.connect()
    response = backend.make_request(BackendRequest())
    print(f"Response received: {response}")
