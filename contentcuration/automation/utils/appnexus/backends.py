from .base import Backend


class Recommendations(Backend):

    def connect(self) -> None:
        return super().connect()

    def make_request(self, url: str, params=None):
        return super().make_request(url, params)

    def request(self) -> None:
        return super().request()

    def response(self) -> None:
        return super().response()

    @classmethod
    def _create_instance(cls) -> 'Recommendations':
        return cls()
