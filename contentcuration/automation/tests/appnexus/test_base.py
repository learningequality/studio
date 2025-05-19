import time
from unittest.mock import patch

import mock
import pytest
import requests
from automation.utils.appnexus.base import Backend
from automation.utils.appnexus.base import BackendRequest
from automation.utils.appnexus.base import BackendResponse
from automation.utils.appnexus.base import SessionWithMaxConnectionAge
from automation.utils.appnexus.errors import ConnectionError
from automation.utils.appnexus.errors import InvalidResponse


def test_session_with_max_connection_age_request():
    with patch.object(requests.Session, "request") as mock_request:
        session = SessionWithMaxConnectionAge()
        session.request("GET", "https://example.com")
        assert mock_request.call_count == 1


def test_session_with_max_connection_age_not_closing_connections():
    with patch.object(requests.Session, "close") as mock_close, patch.object(
        requests.Session, "request"
    ) as mock_request:
        session = SessionWithMaxConnectionAge(60)
        session.request("GET", "https://example.com")
        time.sleep(0.1)
        session.request("GET", "https://example.com")

        assert mock_close.call_count == 0
        assert mock_request.call_count == 2


def test_session_with_max_connection_age_closing_connections():
    with patch.object(requests.Session, "close") as mock_close, patch.object(
        requests.Session, "request"
    ) as mock_request:
        session = SessionWithMaxConnectionAge(1)
        session.request("GET", "https://example.com")
        time.sleep(2)
        session.request("GET", "https://example.com")

        assert mock_close.call_count == 1
        assert mock_request.call_count == 2


@mock.patch("automation.utils.appnexus.base.Backend.connect")
def test_backend_connect(mock_connect):
    mock_connect.return_value = True

    backend = Backend()
    result = backend.connect()

    mock_connect.assert_called_once()
    assert result is True


@mock.patch("automation.utils.appnexus.base.Backend.connect")
def test_backend_connect_error(mock_connect):
    mock_connect.side_effect = [ConnectionError("Failed to connect"), False]

    backend = Backend()

    with pytest.raises(ConnectionError) as exc_info:
        backend.connect()
    assert str(exc_info.value) == "Failed to connect"

    result = backend.connect()
    assert result is False

    assert mock_connect.call_count == 2


@mock.patch("automation.utils.appnexus.base.Backend.make_request")
def test_backend_request(mock_make_request):
    mock_response = BackendResponse(data=[{"key": "value"}])
    mock_make_request.return_value = mock_response

    backend = Backend()
    request = BackendRequest(method="GET", path="/api/test")
    response = backend.make_request(request)

    assert response == mock_response
    mock_make_request.assert_called_once_with(request)


@mock.patch("automation.utils.appnexus.base.Backend.make_request")
def test_backend_request_error(mock_make_request):
    mock_make_request.side_effect = InvalidResponse("Request failed")

    backend = Backend()
    request = BackendRequest(method="GET", path="/api/test")

    with pytest.raises(InvalidResponse) as exc_info:
        backend.make_request(request)
    assert str(exc_info.value) == "Request failed"
    mock_make_request.assert_called_once_with(request)
