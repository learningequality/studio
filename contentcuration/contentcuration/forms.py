import json

from django import forms
from django.conf import settings
from django.contrib.auth.forms import PasswordResetForm
from django.contrib.auth.forms import UserChangeForm
from django.contrib.auth.forms import UserCreationForm
from django.core import signing
from django.core.exceptions import ValidationError
from django.db.models import Q
from django.template.loader import render_to_string

from contentcuration.models import User


REGISTRATION_SALT = getattr(settings, "REGISTRATION_SALT", "registration")


# LOGIN/REGISTRATION FORMS
#################################################################
class RegistrationForm(UserCreationForm):
    CODE_ACCOUNT_ACTIVE = "account_active"
    CODE_ACCOUNT_INACTIVE = "account_inactive"

    first_name = forms.CharField(required=True)
    last_name = forms.CharField(required=True)
    email = forms.EmailField(required=True)
    password1 = forms.CharField(required=True, min_length=8)
    password2 = forms.CharField(required=True)
    uses = forms.CharField(required=True)
    other_use = forms.CharField(required=False)
    storage = forms.CharField(required=False)
    source = forms.CharField(required=True)
    organization = forms.CharField(required=False)
    conference = forms.CharField(required=False)
    other_source = forms.CharField(required=False)
    policies = forms.CharField(required=True)
    locations = forms.CharField(required=True)

    def clean_email(self):
        # ensure email is lower case
        email = self.cleaned_data["email"].strip().lower()
        user_qs = User.objects.filter(email__iexact=email)
        if user_qs.exists():
            if user_qs.filter(Q(is_active=True) | Q(deleted=True)).exists():
                raise ValidationError(
                    "Account already active", code=self.CODE_ACCOUNT_ACTIVE
                )
            else:
                raise ValidationError(
                    "Already registered.", code=self.CODE_ACCOUNT_INACTIVE
                )
        return email

    def save(self, commit=True):
        user = super(RegistrationForm, self).save(commit=False)
        user.first_name = self.cleaned_data["first_name"]
        user.last_name = self.cleaned_data["last_name"]
        user.information = {
            "uses": self.cleaned_data["uses"].split("|"),
            "locations": self.cleaned_data["locations"].split("|"),
            "space_needed": self.cleaned_data["storage"],
            "heard_from": self.cleaned_data["source"],
        }
        user.policies = json.loads(self.cleaned_data["policies"])

        if commit:
            user.save()

        return user

    class Meta:
        model = User
        fields = ("first_name", "last_name", "email")


class ForgotPasswordForm(PasswordResetForm):
    email = forms.EmailField(max_length=254)

    def save(self, request=None, extra_email_context=None, **kwargs):
        """
        Generate a one-use only link for resetting password and send it to the
        user.
        """
        email = self.cleaned_data["email"]
        user = User.get_for_email(email)

        if user and user.is_active:
            super(ForgotPasswordForm, self).save(
                request=request, extra_email_context=extra_email_context, **kwargs
            )
        elif user:
            # For users who were invited but hadn't registered yet
            if not user.password:
                context = {
                    "site": extra_email_context.get("site"),
                    "user": user,
                    "domain": extra_email_context.get("domain"),
                }
                subject = render_to_string(
                    "registration/password_reset_subject.txt", context
                )
                subject = "".join(subject.splitlines())
                message = render_to_string(
                    "registration/registration_needed_email.txt", context
                )
                user.email_user(
                    subject,
                    message,
                    settings.DEFAULT_FROM_EMAIL,
                )
            else:
                activation_key = self.get_activation_key(user)
                context = {
                    "activation_key": activation_key,
                    "expiration_days": settings.ACCOUNT_ACTIVATION_DAYS,
                    "site": extra_email_context.get("site"),
                    "user": user,
                    "domain": extra_email_context.get("domain"),
                }
                subject = render_to_string(
                    "registration/password_reset_subject.txt", context
                )
                subject = "".join(subject.splitlines())
                message = render_to_string(
                    "registration/activation_needed_email.txt", context
                )
                user.email_user(
                    subject,
                    message,
                    settings.DEFAULT_FROM_EMAIL,
                )

    def get_activation_key(self, user):
        """
        Generate the activation key which will be emailed to the user.
        """
        return signing.dumps(
            obj=getattr(user, user.USERNAME_FIELD), salt=REGISTRATION_SALT
        )


class PolicyAcceptForm(forms.Form):
    policy = forms.CharField()

    class Meta:
        model = User
        fields = ("accepted", "policy_names")

    def save(self, user):
        user.policies = user.policies or {}
        user.policies.update(json.loads(self.cleaned_data["policy"]))
        user.save()
        return user


# SETTINGS FORMS
#################################################################
class UsernameChangeForm(UserChangeForm):
    first_name = forms.CharField(required=True)
    last_name = forms.CharField()

    class Meta:
        model = User
        fields = ("first_name", "last_name")
        exclude = ("password", "email")

    def clean_password(self):
        return True

    def save(self, user):
        user.first_name = self.cleaned_data["first_name"]
        user.last_name = self.cleaned_data["last_name"]
        user.save()
        return user


class StorageRequestForm(forms.Form):
    # Nature of content
    storage = forms.CharField(required=True)
    kind = forms.CharField(required=True)
    resource_count = forms.CharField(required=True)
    resource_size = forms.CharField(required=False)
    creators = forms.CharField(required=True)
    sample_link = forms.CharField(required=False)

    # How are you using your content
    license = forms.CharField(required=True)
    public = forms.CharField(required=False)
    audience = forms.CharField(required=True)
    import_count = forms.CharField(required=True)
    location = forms.CharField(required=False)

    # Tell us more about your use of Kolibri
    uploading_for = forms.CharField(required=True)
    organization_type = forms.CharField(required=False)

    # Use case
    time_constraint = forms.CharField(required=False)
    message = forms.CharField(required=True)

    class Meta:
        fields = (
            "storage",
            "kind",
            "resource_count",
            "resource_size",
            "creators",
            "sample_link",
            "license",
            "public",
            "audience",
            "import_count",
            "location",
            "uploading_for",
            "organization_type",
            "time_constraint",
            "message",
        )


class IssueReportForm(forms.Form):
    operating_system = forms.CharField(required=True)
    browser = forms.CharField(required=True)
    channel = forms.CharField(required=False)
    description = forms.CharField(required=True)

    class Meta:
        fields = ("operating_system", "browser", "channel", "description")


class DeleteAccountForm(forms.Form):
    email = forms.CharField(required=True)

    def __init__(self, user, *args, **kwargs):
        self.user = user
        super(DeleteAccountForm, self).__init__(*args, **kwargs)

    def clean_email(self):
        email = self.cleaned_data["email"].strip().lower()
        if self.user.is_admin or self.user.email.lower() != self.cleaned_data["email"]:
            raise ValidationError("Not allowed")
        return email
