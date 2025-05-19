import json
import os
from datetime import date
from datetime import datetime
from datetime import timedelta

from django.conf import settings as ccsettings
from django.contrib.auth.decorators import login_required
from django.contrib.auth.forms import SetPasswordForm
from django.contrib.auth.mixins import LoginRequiredMixin
from django.contrib.auth.views import PasswordChangeView
from django.contrib.sites.shortcuts import get_current_site
from django.core.mail import send_mail
from django.db.models import Count
from django.http import HttpResponse
from django.http import HttpResponseBadRequest
from django.shortcuts import render
from django.template.loader import render_to_string
from django.urls import reverse_lazy
from django.utils.translation import get_language
from django.utils.translation import gettext as _
from django.views.generic.edit import FormView
from rest_framework.decorators import api_view

from .json_dump import json_for_parse_from_data
from .json_dump import json_for_parse_from_serializer
from contentcuration.decorators import browser_is_supported
from contentcuration.forms import DeleteAccountForm
from contentcuration.forms import IssueReportForm
from contentcuration.forms import PolicyAcceptForm
from contentcuration.forms import StorageRequestForm
from contentcuration.forms import UsernameChangeForm
from contentcuration.tasks import generateusercsv_task
from contentcuration.utils.csv_writer import generate_user_csv_filename
from contentcuration.utils.messages import get_messages
from contentcuration.views.base import current_user_for_context
from contentcuration.views.users import logout
from contentcuration.viewsets.channel import SettingsChannelSerializer

ISSUE_UPDATE_DATE = datetime(2018, 10, 29)

CURRENT_USER = "current_user"
MESSAGES = "i18n_messages"


@login_required
@browser_is_supported
def settings(request):
    current_user = current_user_for_context(request.user)
    channel_query = request.user.editable_channels.filter(deleted=False).annotate(
        editor_count=Count("editors")
    )

    return render(
        request,
        "settings.html",
        {
            CURRENT_USER: current_user,
            MESSAGES: json_for_parse_from_data(get_messages()),
            "channels": json_for_parse_from_serializer(
                SettingsChannelSerializer(channel_query, many=True)
            ),
        },
    )


@login_required
@api_view(["GET"])
def export_user_data(request):
    generateusercsv_task.enqueue(
        request.user, user_id=request.user.pk, language=get_language()
    )
    return HttpResponse({"success": True})


class PostFormMixin(LoginRequiredMixin):
    http_method_names = ["post"]
    success_url = reverse_lazy("settings")

    def get_form(self, data):
        return self.form_class(data)

    def post(self, request):
        data = json.loads(request.body)
        form = self.get_form(data)
        if form.is_valid():
            self.form_valid(form)
            return HttpResponse()
        return HttpResponseBadRequest()


class UsernameChangeView(PostFormMixin, FormView):
    form_class = UsernameChangeForm

    def form_valid(self, form):
        form.save(self.request.user)


class UserPasswordChangeView(PostFormMixin, PasswordChangeView):
    form_class = SetPasswordForm

    def get_form(self, data):
        return self.form_class(self.request.user, data)


class IssuesSettingsView(PostFormMixin, FormView):
    form_class = IssueReportForm

    def form_valid(self, form):
        message = render_to_string(
            "settings/issue_report_email.txt",
            {"data": form.cleaned_data, "user": self.request.user},
        )
        send_mail(
            _("Kolibri Studio issue report"),
            message,
            ccsettings.DEFAULT_FROM_EMAIL,
            [ccsettings.HELP_EMAIL, self.request.user.email],
        )


class DeleteAccountView(PostFormMixin, FormView):
    form_class = DeleteAccountForm

    def get_form(self, data):
        return self.form_class(self.request.user, data)

    def form_valid(self, form):
        # Send email to notify team about account being deleted
        buffer_date = (
            date.today() + timedelta(days=ccsettings.ACCOUNT_DELETION_BUFFER)
        ).strftime("%A, %B %d %Y")
        subject = "Kolibri Studio account deleted"
        message = render_to_string(
            "settings/account_deleted_notification_email.txt",
            {"user": self.request.user, "buffer_date": buffer_date},
        )
        send_mail(
            subject,
            message,
            ccsettings.DEFAULT_FROM_EMAIL,
            [ccsettings.REGISTRATION_INFORMATION_EMAIL],
        )

        # Send email to user regarding account deletion
        site = get_current_site(self.request)
        subject = _("Kolibri Studio account deleted")
        message = render_to_string(
            "settings/account_deleted_user_email.txt",
            {
                "user": self.request.user,
                "buffer_date": buffer_date,
                "legal_email": ccsettings.POLICY_EMAIL,
                "num_days": ccsettings.ACCOUNT_DELETION_BUFFER,
                "site_name": site and site.name,
            },
        )
        send_mail(
            subject,
            message,
            ccsettings.DEFAULT_FROM_EMAIL,
            [ccsettings.REGISTRATION_INFORMATION_EMAIL, self.request.user.email],
        )

        # Delete user csv files
        csv_path = generate_user_csv_filename(
            self.request.user
        )  # Remove any generated csvs
        if os.path.exists(csv_path):
            os.unlink(csv_path)

        self.request.user.delete()
        logout(self.request)


class StorageSettingsView(PostFormMixin, FormView):
    form_class = StorageRequestForm

    def form_valid(self, form):
        channels = [c for c in form.cleaned_data["public"].split(", ") if c]
        message = render_to_string(
            "settings/storage_request_email.txt",
            {
                "data": form.cleaned_data,
                "user": self.request.user,
                "channels": channels,
            },
        )

        send_mail(
            f"Kolibri Studio storage request from {self.request.user.email}",
            message,
            ccsettings.DEFAULT_FROM_EMAIL,
            [ccsettings.SPACE_REQUEST_EMAIL, self.request.user.email],
        )


class PolicyAcceptView(PostFormMixin, FormView):
    form_class = PolicyAcceptForm

    def form_valid(self, form):
        form.save(self.request.user)
