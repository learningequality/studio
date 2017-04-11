from google.cloud import error_reporting


class ErrorReportingMiddleware(object):
    def __init__(self, *args, **kwargs):
        self.client = error_reporting.Client()

    def process_exception(self, request, exception):
        self.client.report_exception()
