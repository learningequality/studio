import time
import logging
import requests
from abc import ABC
from abc import abstractmethod
from builtins import NotImplementedError

from . import errors


class SessionWithMaxConnectionAge(requests.Session):
    """
        Session with a maximum connection age. If the connection is older than the specified age, it will be closed and a new one will be created.
        The age is specified in seconds.
    """
    def __init__(self, age = 10):
        self.age = age
        self.last_used = time.time()
        super().__init__()

    def request(self, *args, **kwargs):
        current_time = time.time()
        if current_time - self.last_used > self.age:
            self.close()
            self.__init__(self.age)

        self.last_used = current_time

        return super().request(*args, **kwargs)

class BackendRequest(object):
    """ Class that should be inherited by specific backend for its requests"""
    pass


class BackendResponse(object):
    """ Class that should be inherited by specific backend for its responses"""
    def __init__(self, **kwargs):
        for key, value in kwargs.items():
            setattr(self, key, value)


class Backend(ABC):
    """ An abstract base class for backend interfaces that also implements the singleton pattern """
    _instance = None
    session = None
    base_url = None
    connect_endpoint = None

    def __new__(class_, *args, url_prefix="", **kwargs):
        if not isinstance(class_._instance, class_):
            class_._instance = object.__new__(class_, *args, **kwargs)
            class_._instance.url_prefix = url_prefix
        return class_._instance

    def __init__(self):
        self.session = SessionWithMaxConnectionAge()

    def _construct_full_url(self, path):
        """This method should combine base_url, url_prefix, and path in that order, removing any trailing slashes beforehand."""
        url_array = []
        if self.base_url:
            url_array.append(self.base_url.rstrip("/"))
        if self.url_prefix:
            url_array.append(self.url_prefix.rstrip("/"))
        if path:
            url_array.append(path.lstrip("/"))
        return "/".join(url_array)

    def _make_request(self, path, **kwargs):
        url = self._construct_full_url(path)
        is_retry = kwargs.pop("is_retry", False)
        try: 
            return self.session.request(url, **kwargs)
        except (
            requests.exceptions.ConnectionError,
            requests.exceptions.RequestException,
        ) as e:
            if is_retry:
                logging.error(str(e))
                raise errors.ConnectionError("Connection error occurred. Retried request and failed again.")
            logging.warning(f"Connection error occurred. Retrying request to {url}")
            return self.make_request(path, is_retry=True, **kwargs)
        except (
            requests.exceptions.SSLError,
        ) as e:
            logging.error(str(e))
            raise errors.ConnectionError(f"Unable to connect to {url}")
        except (
            requests.exceptions.Timeout,
            requests.exceptions.ConnectTimeout,
            requests.exceptions.ReadTimeout,
        ) as e:
            logging.error(str(e))
            raise errors.TimeoutError(f"Timeout occurred while connecting to {url}")
        except (
            requests.exceptions.TooManyRedirects,
            requests.exceptions.HTTPError,
        ) as e:
            logging.error(str(e))
            raise errors.HttpError(f"HTTP error occurred while connecting to {url}")
        except (
            requests.exceptions.URLRequired,
            requests.exceptions.MissingSchema,
            requests.exceptions.InvalidSchema,
            requests.exceptions.InvalidURL,
            requests.exceptions.InvalidHeader,
            requests.exceptions.InvalidJSONError,
        ) as e:
            logging.error(str(e))
            raise errors.InvalidRequest(f"Invalid request to {url}")
        except (
            requests.exceptions.ContentDecodingError,
            requests.exceptions.ChunkedEncodingError,
        ) as e:
            logging.error(str(e))
            raise errors.InvalidResponse(f"Invalid response from {url}")
    
    def connect(self):
        """ Establishes a connection to the backend service. """
        try:
            response = self.make_request(self.connect_endpoint, method="GET")
            if response.status_code != 200:
                return False
            return True
        except Exception as e:
            return False

    def make_request(self, path, **kwargs):
        response = self._make_request(path, **kwargs)
        try:
            info = response.json()
            return BackendResponse(**info)
        except ValueError as e:
            logging.error(str(e))
            raise errors.InvalidResponse("Invalid response from backend")

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
