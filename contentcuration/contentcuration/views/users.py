import json

from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.auth import login as djangologin
from django.contrib.auth import logout as djangologout
from django.contrib.auth.views import PasswordResetConfirmView
from django.contrib.auth.views import PasswordResetView
from django.contrib.sites.models import Site
from django.contrib.sites.shortcuts import get_current_site
from django.core.exceptions import ObjectDoesNotExist
from django.core.mail import send_mail
from django.core.urlresolvers import reverse_lazy
from django.http import HttpResponse
from django.http import HttpResponseBadRequest
from django.http import HttpResponseForbidden
from django.shortcuts import redirect
from django.shortcuts import render
from django.template.loader import render_to_string
from django.utils.decorators import method_decorator
from django.utils.translation import ugettext as _
from django.views.decorators.cache import never_cache
from django.views.decorators.debug import sensitive_post_parameters
from registration.backends.hmac.views import ActivationView
from registration.backends.hmac.views import RegistrationView
from rest_framework.authentication import BasicAuthentication
from rest_framework.authentication import SessionAuthentication
from rest_framework.authentication import TokenAuthentication
from rest_framework.decorators import authentication_classes
from rest_framework.decorators import permission_classes
from rest_framework.permissions import IsAuthenticated

from contentcuration.forms import ForgotPasswordForm
from contentcuration.forms import RegistrationForm
from contentcuration.models import Channel
from contentcuration.models import Invitation
from contentcuration.models import User
from contentcuration.statistics import record_user_registration_stats
from contentcuration.utils.policies import check_policies
from contentcuration.utils.policies import get_latest_policies

""" REGISTRATION/INVITATION ENDPOINTS """


@authentication_classes((SessionAuthentication, BasicAuthentication, TokenAuthentication))
@permission_classes((IsAuthenticated,))
def send_invitation_email(request):
    if request.method != 'POST':
        return HttpResponseBadRequest("Only POST requests are allowed on this endpoint.")

    data = json.loads(request.body)

    try:
        user_email = data["user_email"].lower()
        channel_id = data["channel_id"]
        share_mode = data["share_mode"]
        channel = Channel.objects.get(id=channel_id)

        recipient = User.objects.filter(email__iexact=user_email).first()
        if not recipient:
            recipient = User.objects.create(email=user_email)

        request.user.can_view(channel_id)

        fields = {
            "invited": recipient,
            "email": user_email,
            "channel_id": channel_id,
            "first_name": recipient.first_name if recipient.is_active else "Guest",
            "last_name": recipient.last_name if recipient.is_active else " "
        }

        # Need to break into two steps to avoid MultipleObjectsReturned error
        invitation = Invitation.objects.filter(channel_id=channel_id, email=user_email).first()

        if not invitation:
            invitation = Invitation.objects.create(**fields)

        # Handle these values separately as different users might invite the same user again
        invitation.share_mode = share_mode
        invitation.sender = invitation.sender or request.user
        invitation.save()

        ctx_dict = {'sender': request.user,
                    'site': get_current_site(request),
                    'user': recipient,
                    'share_mode': _(share_mode),
                    'channel_id': channel_id,
                    'invitation_key': invitation.id,
                    'is_new': recipient.is_active is False,
                    'channel': channel.name,
                    'domain': request.META.get('HTTP_ORIGIN') or "https://{}".format(
                        request.get_host() or Site.objects.get_current().domain),
                    }
        subject = render_to_string('permissions/permissions_email_subject.txt', ctx_dict)
        message = render_to_string('permissions/permissions_email.txt', ctx_dict)
        # message_html = render_to_string('permissions/permissions_email.html', ctx_dict)
        recipient.email_user(subject, message, settings.DEFAULT_FROM_EMAIL, )  # html_message=message_html,)
        # recipient.email_user(subject, message, settings.DEFAULT_FROM_EMAIL,)
    except KeyError:
        raise ObjectDoesNotExist("Missing attribute from data: {}".format(data))

    return HttpResponse(json.dumps({
        "id": invitation.pk,
        "invited": invitation.invited_id,
        "email": invitation.email,
        "sender": invitation.sender_id,
        "channel": invitation.channel_id,
        "first_name": invitation.first_name,
        "last_name": invitation.last_name,
        "share_mode": invitation.share_mode,
    }))


def login(request):
    if request.method != 'POST':
        return HttpResponseBadRequest("Only POST requests are allowed on this endpoint.")

    data = json.loads(request.body)
    username = data['username'].lower()
    password = data['password']
    user = authenticate(username=username, password=password)
    if user is not None:
        if user.is_active:
            djangologin(request, user)
            return redirect(reverse_lazy("channels"))

    user = User.objects.filter(email__iexact=username, is_active=False).first()
    if user and user.check_password(password):
        return HttpResponseBadRequest(status=405, reason="Account hasn't been activated")

    # Return an 'invalid login' error message.
    return HttpResponseForbidden()


def logout(request):
    djangologout(request)
    return HttpResponse()


def policies(request):
    if request.user.is_anonymous() or request.GET.get('all'):
        policies = get_latest_policies()
    else:
        policies = check_policies(request.user)

    return render(request, "policies/text/terms_of_service.html", {"policies": policies})


class UserRegistrationView(RegistrationView):
    form_class = RegistrationForm
    email_body_template = 'registration/activation_email.txt'
    email_subject_template = 'registration/activation_email_subject.txt'
    email_html_template = 'registration/activation_email.html'
    template_name = 'registration/registration_information_form.html'
    http_method_names = ['post']

    def post(self, request):
        form = self.form_class(json.loads(request.body))
        try:
            if form.is_valid():
                self.register(form)
                return HttpResponse()
            elif form._errors['email']:
                return HttpResponseBadRequest(status=405, reason="Account hasn't been activated")
            return HttpResponseBadRequest()
        except UserWarning:
            return HttpResponseForbidden()

    def send_activation_email(self, user):
        activation_key = self.get_activation_key(user)
        context = self.get_email_context(activation_key)
        context.update({
            'user': user,
            'domain': self.request.META.get('HTTP_ORIGIN') or "https://{}".format(
                self.request.get_host() or Site.objects.get_current().domain),
        })
        subject = render_to_string(self.email_subject_template, context)
        subject = ''.join(subject.splitlines())
        message = render_to_string(self.email_body_template, context)
        user.email_user(subject, message, settings.DEFAULT_FROM_EMAIL)

        record_user_registration_stats(user)


class UserActivationView(ActivationView):

    def get(self, *args, **kwargs):
        """
        Overrite get method to redirect to failed activation url
        page from the frontend templates
        """
        response = super(UserActivationView, self).get(*args, **kwargs)
        if response.status_code == 302:
            return response

        return redirect('/accounts/#/activation-expired')

    def get_success_url(self, user):
        return '/accounts/#/account-created'

    def activate(self, *args, **kwargs):
        user = super(UserActivationView, self).activate(*args, **kwargs)

        if settings.SEND_USER_ACTIVATION_NOTIFICATION_EMAIL and user:
            # Send email regarding new user information
            subject = render_to_string('registration/custom_email_subject.txt', {"subject": "New Kolibri Studio Registration"})
            message = render_to_string('registration/registration_information_email.txt', {
                "user": user,
                "information": dict(user.information)
            })
            send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [settings.REGISTRATION_INFORMATION_EMAIL])

        return user


class UserPasswordResetView(PasswordResetView):
    form_class = ForgotPasswordForm
    http_method_names = ['post']

    def post(self, request):
        protocol = 'https' if request.is_secure() else 'http'
        site = request.get_host() or Site.objects.get_current().domain
        email_context = {
            'site': get_current_site(request),
            'domain': request.META.get('HTTP_ORIGIN') or "{}://{}".format(protocol, site)
        }
        form = self.form_class(json.loads(request.body))
        if form.is_valid():
            form.save(
                use_https=request.is_secure(),
                request=request,
                extra_email_context=email_context,
                from_email=settings.DEFAULT_FROM_EMAIL,
                email_template_name='registration/password_reset_email.txt',
                subject_template_name='registration/password_reset_subject.txt',
            )
        return HttpResponse()


class UserPasswordResetConfirmView(PasswordResetConfirmView):
    http_method_names = ['get', 'post']

    @method_decorator(sensitive_post_parameters())
    @method_decorator(never_cache)
    def dispatch(self, request, *args, **kwargs):
        response = super(UserPasswordResetConfirmView, self).dispatch(request, *args, **kwargs)

        if request.method == 'POST':
            return self.post(request, *args, **kwargs)

        # Token is valid, redirect to password reset page
        if response.status_code == 302:
            return redirect('/accounts/#/reset-password?uidb64={}&token={}'.format(kwargs['uidb64'], kwargs['token']))

        return redirect('/accounts/#/reset-expired')

    def get_success_url(self):
        return '/accounts/#/password-reset-success'

    def post(self, request, *args, **kwargs):
        form = self.form_class(self.user, json.loads(request.body))

        if form.is_valid():
            return self.form_valid(form)
        return HttpResponseForbidden()


def request_activation_link(request):
    if request.method != 'POST':
        return HttpResponseBadRequest("Only POST requests are allowed on this endpoint.")
    data = json.loads(request.body)
    try:
        user = User.objects.get(email=data['email'])
        registration_view = UserRegistrationView()
        registration_view.request = request
        registration_view.send_activation_email(user)
    except User.DoesNotExist:
        pass
    return HttpResponse()  # Return success no matter what so people can't try to look up emails


def new_user_redirect(request, user_id):
    user = User.objects.get(pk=user_id)
    if user.is_active:
        return redirect(reverse_lazy("channels"))
    djangologout(request)
    request.session["email"] = user.email
    request.session["freeze_email"] = True

    return redirect(reverse_lazy("registration_register"))
