import time
import pytest
import requests
from unittest.mock import patch

from automation.utils.appnexus.base import Adapter
from automation.utils.appnexus.base import Backend
from automation.utils.appnexus.base import SessionWithMaxConnectionAge


class MockBackend(Backend):
    def connect(self) -> None:
        return super().connect()

    def make_request(self, request):
        return super().make_request(request)

    @classmethod
    def _create_instance(cls) -> 'MockBackend':
        return cls()


class MockAdapter(Adapter):
    def mockoperation(self):
        pass


def test_backend_error():
    with pytest.raises(NotImplementedError) as error:
        Backend.get_instance()
    assert "Subclasses should implement the creation of instance" in str(error.value)

def test_backend_singleton():
    b1, b2 = MockBackend.get_instance(), MockBackend.get_instance()
    assert id(b1) == id(b2)


def test_adapter_creation():
    a = MockAdapter(backend=MockBackend)
    assert isinstance(a, Adapter)


def test_adapter_backend_default():
    b = MockBackend()
    adapter = Adapter(backend=b)
    assert isinstance(adapter.backend, Backend)


def test_adapter_backend_custom():
    b = MockBackend()
    a = Adapter(backend=b)
    assert a.backend is b

def test_session_with_max_connection_age_request():
    with patch.object(requests.Session, 'request') as mock_request:
        session = SessionWithMaxConnectionAge()
        session.request('GET', 'https://example.com')
        assert mock_request.call_count == 1

def test_session_with_max_connection_age_not_closing_connections():
    with patch.object(requests.Session, 'close') as mock_close,\
        patch.object(requests.Session, 'request') as mock_request:
        session = SessionWithMaxConnectionAge(60)
        session.request('GET', 'https://example.com')
        time.sleep(0.1)
        session.request('GET', 'https://example.com')

        assert mock_close.call_count == 0
        assert mock_request.call_count == 2

def test_session_with_max_connection_age_closing_connections():
    with patch.object(requests.Session, 'close') as mock_close,\
        patch.object(requests.Session, 'request') as mock_request:
        session = SessionWithMaxConnectionAge(1)
        session.request('GET', 'https://example.com')
        time.sleep(2)
        session.request('GET', 'https://example.com')

        assert mock_close.call_count == 1
        assert mock_request.call_count == 2