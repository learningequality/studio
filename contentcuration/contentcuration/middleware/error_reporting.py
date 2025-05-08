import os

from google.cloud import error_reporting


class ErrorReportingMiddleware(object):
    def __init__(self, *args, **kwargs):
        self.client = error_reporting.Client.from_service_account_json(
            os.getenv("GOOGLE_APPLICATION_CREDENTIALS"),
            service=os.getenv("GCLOUD_DEBUGGER_APP_IDENTIFIER"),
            _use_grpc=False,
        )

    def process_exception(self, request, exception):
        self.client.report_exception()
