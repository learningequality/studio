import pytest

from automation.utils.appnexus.base import Adapter
from automation.utils.appnexus.base import Backend


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
