import logging
import time
from abc import ABC
from abc import abstractmethod

import requests
from requests.adapters import HTTPAdapter
from urllib3 import Retry

from . import errors


class SessionWithMaxConnectionAge(requests.Session):
    """
    Session with a maximum connection age. If the connection is older than the specified age, it will be closed and a new one will be created.
    The age is specified in seconds.
    """

    def __init__(self, age=100):
        super().__init__()
        self.age = age
        self.last_used = time.time()

    def request(self, *args, **kwargs):
        current_time = time.time()
        if current_time - self.last_used > self.age:
            self.close()

        self.last_used = current_time

        return super().request(*args, **kwargs)


class BackendRequest(object):
    """ Class that holds the request information for the backend """

    def __init__(
        self,
        method,
        path,
        params=None,
        data=None,
        json=None,
        headers=None,
        timeout=(5, 100),
        **kwargs,
    ):
        self.method = method
        self.path = path
        self.params = params
        self.data = data
        self.json = json
        self.headers = headers
        self.timeout = timeout
        for key, value in kwargs.items():
            setattr(self, key, value)


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
    max_retries = 1
    backoff_factor = 0.3

    def __new__(cls, *args, **kwargs):
        if not isinstance(cls._instance, cls):
            cls._instance = object.__new__(cls)
        return cls._instance

    def __init__(
        self,
        url_prefix="stable",
    ):
        self.url_prefix = url_prefix
        if not self.session:
            self._setup_session()

    def _setup_session(self):
        self.session = SessionWithMaxConnectionAge()

        retry = Retry(
            total=self.max_retries,
            backoff_factor=self.backoff_factor,
        )
        adapter = HTTPAdapter(max_retries=retry)

        self.session.mount("https://", adapter)
        self.session.mount("http://", adapter)

    def _construct_full_url(self, path):
        """This method combine base_url, url_prefix, and path in that order, removing any trailing and leading slashes."""
        url_array = []
        if self.base_url:
            url_array.append(self.base_url.rstrip("/"))
        if self.url_prefix:
            url_array.append(self.url_prefix.rstrip("/").lstrip("/"))
        if path:
            url_array.append(path.lstrip("/"))
        return "/".join(url_array)

    def _make_request(self, request):
        url = self._construct_full_url(request.path)
        try:
            response = self.session.request(
                request.method,
                url,
                params=request.params,
                data=request.data,
                headers=request.headers,
                json=request.json,
                timeout=request.timeout,
            )
            response.raise_for_status()
            return response
        except (
            requests.exceptions.ConnectionError,
            requests.exceptions.RequestException,
            requests.exceptions.SSLError,
        ) as e:
            logging.exception(e)
            raise errors.ConnectionError(f"Unable to connect to {url}")
        except (
            requests.exceptions.Timeout,
            requests.exceptions.ConnectTimeout,
            requests.exceptions.ReadTimeout,
        ) as e:
            logging.exception(e)
            raise errors.TimeoutError(f"Timeout occurred while connecting to {url}")
        except (
            requests.exceptions.TooManyRedirects,
            requests.exceptions.HTTPError,
        ) as e:
            logging.exception(e)
            raise errors.HttpError(f"HTTP error occurred while connecting to {url}")
        except (
            requests.exceptions.URLRequired,
            requests.exceptions.MissingSchema,
            requests.exceptions.InvalidSchema,
            requests.exceptions.InvalidURL,
            requests.exceptions.InvalidHeader,
            requests.exceptions.InvalidJSONError,
        ) as e:
            logging.exception(e)
            raise errors.InvalidRequest(f"Invalid request to {url}")
        except (
            requests.exceptions.ContentDecodingError,
            requests.exceptions.ChunkedEncodingError,
        ) as e:
            logging.exception(e)
            raise errors.InvalidResponse(f"Invalid response from {url}")

    def connect(self, **kwargs):
        """ Establishes a connection to the backend service. """
        try:
            request = BackendRequest(method="GET", path=self.connect_endpoint, **kwargs)
            api_response = self._make_request(request)
            response_data = api_response.json()
            status = response_data.get("status", None)
            return status == "OK"
        except Exception:
            return False

    def make_request(self, request):
        """ Make a request to the backend service. """
        try:
            api_response = self._make_request(request)
            response_data = api_response.json()
            return BackendResponse(data=response_data)
        except ValueError as e:
            logging.exception(e)
            raise errors.InvalidResponse("Invalid response from backend")


class BackendFactory(ABC):
    @abstractmethod
    def create_backend(self) -> Backend:
        """ Create a Backend instance from the given backend. """
        pass


class CompositeBackend:
    def __init__(self, backend, prefixes):
        self.backend = backend
        self.prefixes = prefixes
        self._connected = False

    def connect(self, **kwargs):
        """
        Loops through a list of prefixes in order to establish
        which backend is available to connect.

        """
        for prefix in self.prefixes:
            self.backend.url_prefix = prefix
            if self.backend.connect():
                self._connected = True
                return True
        raise AssertionError(
            f"Could not connect to any backend in list: {self.prefixes}"
        )

    def make_request(self, request):
        if self._connected:
            return self.backend.make_request(request)
        else:
            self.connect()
            return self.backend.make_request(request)


class Adapter:
    """
    Base class for adapters that interact with a backend interface.

    This class should be inherited by adapter classes that facilitate
    interaction with different backend implementations.
    """

    def __init__(self, backend: Backend) -> None:
        self.backend = backend
