import json
import logging

from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.auth import login as djangologin
from django.contrib.auth import logout as djangologout
from django.contrib.auth.views import PasswordResetConfirmView
from django.contrib.auth.views import PasswordResetView
from django.contrib.sites.models import Site
from django.contrib.sites.shortcuts import get_current_site
from django.core.exceptions import PermissionDenied
from django.core.mail import send_mail
from django.db import IntegrityError
from django.http import HttpResponse
from django.http import HttpResponseBadRequest
from django.http import HttpResponseForbidden
from django.http import HttpResponseNotAllowed
from django.shortcuts import redirect
from django.template.loader import render_to_string
from django.urls import reverse_lazy
from django.utils.decorators import method_decorator
from django.views.decorators.cache import never_cache
from django.views.decorators.debug import sensitive_post_parameters
from django_registration.backends.activation.views import ActivationView
from django_registration.backends.activation.views import RegistrationView
from rest_framework.authentication import BasicAuthentication
from rest_framework.authentication import SessionAuthentication
from rest_framework.authentication import TokenAuthentication
from rest_framework.decorators import api_view
from rest_framework.decorators import authentication_classes
from rest_framework.decorators import permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from contentcuration.forms import ForgotPasswordForm
from contentcuration.forms import RegistrationForm
from contentcuration.models import Channel
from contentcuration.models import Invitation
from contentcuration.models import User
from contentcuration.viewsets.invitation import InvitationSerializer


""" REGISTRATION/INVITATION ENDPOINTS """

logger = logging.getLogger(__name__)


@api_view(["POST"])
@authentication_classes(
    (SessionAuthentication, BasicAuthentication, TokenAuthentication)
)
@permission_classes((IsAuthenticated,))
def send_invitation_email(request):
    try:
        user_email = request.data["user_email"].lower()
        channel_id = request.data["channel_id"]
        share_mode = request.data["share_mode"]
        channel = Channel.objects.get(id=channel_id)

        recipient = User.get_for_email(user_email)

        if not request.user.can_edit(channel_id):
            raise PermissionDenied()

        fields = {
            "invited": recipient,
            "email": user_email,
            "channel_id": channel_id,
            "first_name": recipient.first_name if recipient else "",
            "last_name": recipient.last_name if recipient else "",
        }

        # Need to break into two steps to avoid MultipleObjectsReturned error
        invitation = Invitation.objects.filter(
            channel_id=channel_id,
            email=user_email,
            revoked=False,
            accepted=False,
            declined=False,
        ).first()

        if not invitation:
            invitation = Invitation.objects.create(**fields)

        # Handle these values separately as different users might invite the same user again
        invitation.share_mode = share_mode
        invitation.sender = invitation.sender or request.user
        invitation.save()

        ctx_dict = {
            "sender": request.user,
            "site": get_current_site(request),
            "user": recipient,
            "email": user_email,
            "first_name": recipient.first_name if recipient else user_email,
            "share_mode": share_mode,
            "channel_id": channel_id,
            "invitation_key": invitation.id,
            "channel": channel.name,
            "domain": "https://{}".format(Site.objects.get_current().domain),
        }
        subject = render_to_string(
            "permissions/permissions_email_subject.txt", ctx_dict
        )
        subject = "".join(subject.splitlines())
        message = render_to_string("permissions/permissions_email.txt", ctx_dict)
        send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [user_email])
    except KeyError:
        return HttpResponseBadRequest(
            "Missing attribute from data: {}".format(request.data)
        )

    return Response(InvitationSerializer(invitation).data)


@api_view(["GET"])
@authentication_classes((SessionAuthentication,))
@permission_classes((IsAuthenticated,))
def deferred_user_space_by_kind(request):
    return Response(
        {
            "space_used_by_kind": request.user.get_space_used_by_kind(),
        }
    )


@api_view(["GET"])
@authentication_classes((SessionAuthentication,))
@permission_classes((IsAuthenticated,))
def deferred_user_api_token(request):
    return Response(
        {
            "api_token": request.user.get_token(),
        }
    )


def login(request):
    if request.method != "POST":
        return redirect(reverse_lazy("accounts"))

    data = json.loads(request.body)
    user = User.get_for_email(data["username"])
    password = data["password"]

    # User not found
    if not user:
        return HttpResponseForbidden()
    # User is not activated
    if not user.is_active and user.check_password(password):
        return HttpResponseBadRequest(
            status=405, reason="Account hasn't been activated"
        )

    user = authenticate(username=user.email, password=password)
    if user is not None:
        djangologin(request, user)
        return redirect(reverse_lazy("channels"))

    # Return an 'invalid login' error message.
    return HttpResponseForbidden()


def logout(request):
    djangologout(request)
    return HttpResponse()


class UserRegistrationView(RegistrationView):
    form_class = RegistrationForm
    email_body_template = "registration/activation_email.txt"
    email_subject_template = "registration/activation_email_subject.txt"
    email_html_template = "registration/activation_email.html"
    template_name = "registration/registration_information_form.html"
    http_method_names = ["post"]

    def get_form_kwargs(self):
        kwargs = super(UserRegistrationView, self).get_form_kwargs()
        # override the form data with the json data
        kwargs["data"] = json.loads(self.request.body)
        return kwargs

    def form_valid(self, form):
        try:
            self.register(form)
            return HttpResponse()
        except IntegrityError as e:
            # Handle race condition where duplicate user is created between
            # form validation and save (e.g., double submit)
            logger.warning(
                "IntegrityError during user registration, likely due to race condition: %s",
                str(e),
                extra={"email": form.cleaned_data.get("email")},
            )
            # Return same error as duplicate active account for consistency
            return HttpResponseForbidden(json.dumps(["email"]))

    def form_invalid(self, form):
        # frontend handles the error messages
        error_response = json.dumps(list(form.errors.keys()))

        if form.has_error("email", code=form.CODE_ACCOUNT_ACTIVE):
            return HttpResponseForbidden(error_response)
        elif form.has_error("email", code=form.CODE_ACCOUNT_INACTIVE):
            return HttpResponseNotAllowed(error_response)

        return HttpResponseBadRequest(error_response)

    def send_activation_email(self, user):
        activation_key = self.get_activation_key(user)
        context = self.get_email_context(activation_key)
        context.update(
            {
                "user": user,
                "domain": self.request.META.get("HTTP_ORIGIN")
                or "https://{}".format(
                    self.request.get_host() or Site.objects.get_current().domain
                ),
            }
        )
        subject = render_to_string(self.email_subject_template, context)
        subject = "".join(subject.splitlines())
        message = render_to_string(self.email_body_template, context)
        user.email_user(subject, message, settings.DEFAULT_FROM_EMAIL)


class UserActivationView(ActivationView):
    def get(self, *args, **kwargs):
        """
        Overrite get method to redirect to failed activation url
        page from the frontend templates
        """
        response = super(UserActivationView, self).get(*args, **kwargs)
        if response.status_code == 302:
            return response

        return redirect("/accounts/#/activation-expired")

    def get_success_url(self, user):
        return "/accounts/#/account-created"

    def get_user(self, username):
        return User.get_for_email(username, is_active=False)

    def activate(self, *args, **kwargs):
        username = self.validate_key(kwargs.get("activation_key"))
        if not username:
            return False

        # protect against activating an alternate casing of the email
        user = User.get_for_email(username)
        if user and user.is_active:
            if username != user.email:
                logger.warning(
                    "Attempted to activate alternate-cased username with already active user"
                )
                return False
            return user

        user = super(UserActivationView, self).activate(*args, **kwargs)

        if settings.SEND_USER_ACTIVATION_NOTIFICATION_EMAIL and user:
            # Send email regarding new user information
            subject = render_to_string(
                "registration/custom_email_subject.txt",
                {"subject": "New Kolibri Studio Registration"},
            )
            subject = "".join(subject.splitlines())
            message = render_to_string(
                "registration/registration_information_email.txt",
                {"user": user, "information": dict(user.information)},
            )
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [settings.REGISTRATION_INFORMATION_EMAIL],
            )
            # Send email to welcome new user
            subject = render_to_string(
                "registration/welcome_new_user_email_subject.txt"
            )
            subject = "".join(subject.splitlines())
            message = render_to_string(
                "registration/welcome_new_user_email.html",
                {"domain": "https://{}".format(Site.objects.get_current().domain)},
            )
            user.email_user(
                subject, message, settings.DEFAULT_FROM_EMAIL, html_message=message
            )

        return user


class UserPasswordResetView(PasswordResetView):
    form_class = ForgotPasswordForm
    http_method_names = ["post"]

    def post(self, request):
        email_context = {
            "site": get_current_site(request),
            "domain": "https://{}".format(Site.objects.get_current().domain),
        }
        form = self.form_class(json.loads(request.body))
        if form.is_valid():
            form.save(
                use_https=request.is_secure(),
                request=request,
                extra_email_context=email_context,
                from_email=settings.DEFAULT_FROM_EMAIL,
                email_template_name="registration/password_reset_email.txt",
                subject_template_name="registration/password_reset_subject.txt",
            )
        return HttpResponse()


class UserPasswordResetConfirmView(PasswordResetConfirmView):
    http_method_names = ["get", "post"]

    @method_decorator(sensitive_post_parameters())
    @method_decorator(never_cache)
    def dispatch(self, request, *args, **kwargs):
        response = super(UserPasswordResetConfirmView, self).dispatch(
            request, *args, **kwargs
        )

        if request.method == "POST":
            return self.post(request, *args, **kwargs)

        # Token is valid, redirect to password reset page
        if response.status_code == 302:
            return redirect(
                "/accounts/#/reset-password?uidb64={}&token={}".format(
                    kwargs["uidb64"], kwargs["token"]
                )
            )

        return redirect("/accounts/#/reset-expired")

    def get_success_url(self):
        return "/accounts/#/password-reset-success"

    def post(self, request, *args, **kwargs):
        form = self.form_class(self.user, json.loads(request.body))

        if form.is_valid():
            return self.form_valid(form)
        return HttpResponseForbidden()


def request_activation_link(request):
    if request.method != "POST":
        return HttpResponseBadRequest(
            "Only POST requests are allowed on this endpoint."
        )
    data = json.loads(request.body)
    try:
        user = User.get_for_email(data["email"])
        if user and not user.is_active:
            registration_view = UserRegistrationView()
            registration_view.request = request
            registration_view.send_activation_email(user)
    except User.DoesNotExist:
        pass
    return (
        HttpResponse()
    )  # Return success no matter what so people can't try to look up emails


def new_user_redirect(request, email):
    # If user is accepting an invitation when they were invited without an account
    user = User.get_for_email(email)

    # User has been activated since the invitation was sent
    if user and user.is_active:
        return redirect(reverse_lazy("base"))

    logout(request)

    # User has created an account, but hasn't activated it yet
    if user and not user.is_active and user.password:
        return redirect("/accounts/#/account-not-active")

    # User needs to create an account
    return redirect("/accounts/#/create?email={}".format(email))
