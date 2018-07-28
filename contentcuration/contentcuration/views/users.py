import json
import logging

from django.conf import settings
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.views import password_reset
from django.contrib.sites.models import Site
from django.contrib.sites.shortcuts import get_current_site
from django.core.exceptions import ObjectDoesNotExist
from django.core.mail import send_mail
from django.core.urlresolvers import reverse_lazy
from django.http import HttpResponse, HttpResponseBadRequest
from django.shortcuts import render, redirect
from django.template.loader import render_to_string
from django.utils.translation import ugettext as _
from django.views.decorators.csrf import csrf_exempt
from django.views.generic.edit import FormView
from registration.backends.hmac.views import RegistrationView, ActivationView

from contentcuration.api import add_editor_to_channel
from contentcuration.forms import RegistrationForm, RegistrationInformationForm, USAGES
from contentcuration.models import Channel, User, Invitation
from contentcuration.statistics import record_user_registration_stats
from contentcuration.utils.policies import get_latest_policies

""" REGISTRATION/INVITATION ENDPOINTS """


@csrf_exempt
def send_invitation_email(request):
    if request.method != 'POST':
        return HttpResponseBadRequest("Only POST requests are allowed on this endpoint.")

    data = json.loads(request.body)

    try:
        user_email = data["user_email"]
        channel_id = data["channel_id"]
        share_mode = data["share_mode"]
        retrieved_user = User.objects.get_or_create(email=user_email)
        recipient = retrieved_user[0]
        channel = Channel.objects.get(id=channel_id)

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
                    'domain': request.META.get('HTTP_ORIGIN') or "http://{}".format(
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

class UserRegistrationView(RegistrationView):
    form_class = RegistrationForm

    def get_initial(self):
        initial = self.initial.copy()
        return {
            'email': self.request.session.get('email', None),
            'first_name': self.request.session.get('first_name', None),
            'last_name': self.request.session.get('last_name', None),
            'password1': self.request.session.get('password1', None),
            'password2': self.request.session.get('password2', None),
        }

    def get_context_data(self, **kwargs):
        kwargs = super(UserRegistrationView, self).get_context_data(**kwargs)
        kwargs.update({"freeze_email": self.request.session.get("freeze_email"),})
        return kwargs

    def post(self, request):
        form = self.form_class(request.POST)
        if form.is_valid():
            # Store information in session in case user goes back
            self.request.session.update(form.cleaned_data)
            return redirect(reverse_lazy('registration_information'))
        return super(UserRegistrationView, self).post(request)

class InformationRegistrationView(RegistrationView):
    email_body_template = 'registration/activation_email.txt'
    email_subject_template = 'registration/activation_email_subject.txt'
    email_html_template = 'registration/activation_email.html'
    template_name = 'registration/registration_information_form.html'
    form_class = RegistrationInformationForm

    def get_form_kwargs(self):
        kw = super(InformationRegistrationView, self).get_form_kwargs()
        kw['request'] = self.request
        return kw

    def get_context_data(self, **kwargs):
        kwargs = super(InformationRegistrationView, self).get_context_data(**kwargs)
        kwargs.update({"help_email": settings.HELP_EMAIL, "policies": get_latest_policies()})
        return kwargs

    def get_initial(self):
        initial = self.initial.copy()
        return {
            'email': self.request.session.get('email', None),
            'first_name': self.request.session.get('first_name', None),
            'last_name': self.request.session.get('last_name', None),
            'password1': self.request.session.get('password1', None),
            'password2': self.request.session.get('password2', None),
        }

    def register(self, form):
        # Clear session cached fields
        self.request.session["freeze_email"] = False
        for field in RegistrationForm.Meta.fields:
            self.request.session[field] = ""

        return super(InformationRegistrationView, self).register(form)

    def send_activation_email(self, user):
        activation_key = self.get_activation_key(user)
        context = self.get_email_context(activation_key)
        context.update({
            'user': user,
            'domain': self.request.META.get('HTTP_ORIGIN') or "http://{}".format(
                self.request.get_host() or Site.objects.get_current().domain),
        })
        subject = render_to_string(self.email_subject_template, context)
        subject = ''.join(subject.splitlines())
        message = render_to_string(self.email_body_template, context)
        # message_html = render_to_string(self.email_html_template, context)
        user.email_user(subject, message, settings.DEFAULT_FROM_EMAIL, )  # html_message=message_html,)

        record_user_registration_stats(user)

def custom_password_reset(request, **kwargs):
    email_context = {'site': get_current_site(request), 'domain': request.META.get('HTTP_ORIGIN') or "http://{}".format(
        request.get_host() or Site.objects.get_current().domain)}
    return password_reset(request, extra_email_context=email_context, **kwargs)

def new_user_redirect(request, user_id):
    user = User.objects.get(pk=user_id)
    if user.is_active:
        return redirect(reverse_lazy("channels"))
    logout(request)
    request.session["email"] = user.email
    request.session["freeze_email"] = True

    return redirect(reverse_lazy("registration_register"))

class UserActivationView(ActivationView):
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
