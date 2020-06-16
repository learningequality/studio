from webpack_loader.loader import WebpackLoader


class TestWebpackLoader(WebpackLoader):
    """
    A dummy webpack loader class to avoid
    us having to build frontend assets for tests
    """

    def get_bundle(self, bundle):
        return []
