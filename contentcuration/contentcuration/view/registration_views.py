import json
import logging

from django.conf import settings
from django.contrib.auth import authenticate, login
from django.contrib.auth.views import password_reset
from django.contrib.sites.models import Site
from django.contrib.sites.shortcuts import get_current_site
from django.core.exceptions import ObjectDoesNotExist
from django.core.urlresolvers import reverse_lazy
from django.http import HttpResponse, HttpResponseBadRequest
from django.shortcuts import render, redirect
from django.template.loader import render_to_string
from django.utils.translation import ugettext as _
from django.views.decorators.csrf import csrf_exempt
from django.views.generic.edit import FormView
from registration.backends.hmac.views import RegistrationView

from contentcuration.api import add_editor_to_channel
from contentcuration.forms import InvitationForm, InvitationAcceptForm, RegistrationForm
from contentcuration.models import Channel, User, Invitation
from contentcuration.statistics import record_user_registration_stats

""" REGISTRATION/INVITATION ENDPOINTS """


@csrf_exempt
def send_invitation_email(request):
    if request.method != 'POST':
        raise HttpResponseBadRequest("Only POST requests are allowed on this endpoint.")
    else:
        data = json.loads(request.body)

        try:
            user_email = data["user_email"]
            channel_id = data["channel_id"]
            share_mode = data["share_mode"]
            retrieved_user = User.objects.get_or_create(email=user_email)
            recipient = retrieved_user[0]
            channel = Channel.objects.get(id=channel_id)

            request.user.can_view(channel_id)

            invitation = Invitation.objects.get_or_create(invited = recipient,
                                                        email = user_email,
                                                        channel_id = channel_id,
                                                        first_name=recipient.first_name if recipient.is_active else "Guest",
                                                        last_name=recipient.last_name if recipient.is_active else " ")[0]

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


class InvitationAcceptView(FormView):
    form_class = InvitationAcceptForm
    template_name = 'permissions/permissions_confirm.html'
    invitation = None

    def get_initial(self):
        initial = self.initial.copy()
        return {'userid': self.invitation.invited.pk}

    def get_form_kwargs(self):
        kwargs = super(InvitationAcceptView, self).get_form_kwargs()
        kwargs.update({'user': self.user()})
        return kwargs

    def get_success_url(self):
        page_name = "channel"
        if self.invitation.share_mode == "view":
            page_name = "channel_view_only"
        return reverse_lazy(page_name, kwargs={'channel_id': self.invitation.channel.pk})

    def dispatch(self, *args, **kwargs):
        try:
            self.invitation = Invitation.objects.get(id=self.kwargs['invitation_link'])
        except ObjectDoesNotExist:
            logging.debug("No invitation found.")
            return redirect(reverse_lazy('fail_invitation'))

        return super(InvitationAcceptView, self).dispatch(*args, **kwargs)

    def user(self):
        return self.invitation.invited

    def form_valid(self, form):
        add_editor_to_channel(self.invitation)

        user_cache = authenticate(username=self.invitation.invited.email,
                                  password=form.cleaned_data['password'],
                                  )
        login(self.request, user_cache)

        return redirect(self.get_success_url())

    def form_invalid(self, form):
        return self.render_to_response(self.get_context_data(form=form))

    def get_context_data(self, **kwargs):
        return super(InvitationAcceptView, self).get_context_data(**kwargs)


class InvitationRegisterView(FormView):
    """
    Base class for user registration views.
    """
    disallowed_url = 'registration_disallowed'
    form_class = InvitationForm
    success_url = None
    template_name = 'permissions/permissions_register.html'
    invitation = None

    def get_initial(self):
        initial = self.initial.copy()
        return {'email': self.user().email}

    def get_success_url(self):
        if self.kwargs.get("invitation_link"):
            return reverse_lazy('accept_invitation', kwargs={'invitation_link': self.kwargs["invitation_link"]})
        else:
            return reverse_lazy('channels')

    def get_login_url(self):
        if self.invitation:
            page_name = "channel"
            if self.invitation.share_mode == "view":
                page_name = "channel_view_only"
            return reverse_lazy(page_name, kwargs={'channel_id': self.invitation.channel.pk})
        else:
            return reverse_lazy('channels')

    def dispatch(self, *args, **kwargs):
        if not getattr(settings, 'REGISTRATION_OPEN', True):
            return redirect(self.disallowed_url)

        if self.kwargs.get("invitation_link"):
            try:
                self.invitation = Invitation.objects.get(id__exact=self.kwargs['invitation_link'])
            except ObjectDoesNotExist:
                logging.debug("No invitation found.")
                return redirect(reverse_lazy('fail_invitation'))

            if self.invitation.invited.is_active:
                return redirect(self.get_success_url())
        elif self.user().is_active:
            return redirect(self.get_success_url())

        return super(InvitationRegisterView, self).dispatch(*args, **kwargs)

    def form_valid(self, form):
        user = form.save(self.user())
        if self.invitation:
            add_editor_to_channel(self.invitation)
        user_cache = authenticate(username=user.email,
                                  password=form.cleaned_data['password1'],
                                  )
        login(self.request, user_cache)
        return redirect(self.get_login_url())

    def form_invalid(self, form):

        return self.render_to_response(self.get_context_data(form=form))

    def user(self):
        return User.objects.get_or_create(id=self.kwargs["user_id"])[0]

    def get_context_data(self, **kwargs):
        return super(InvitationRegisterView, self).get_context_data(**kwargs)


def decline_invitation(request, invitation_link):
    try:
        invitation = Invitation.objects.get(id=invitation_link)
        invitation.delete()

    except ObjectDoesNotExist:
        logging.debug("No invitation found.")

    return render(request, 'permissions/permissions_decline.html')


def fail_invitation(request):
    return render(request, 'permissions/permissions_fail.html')


class UserRegistrationView(RegistrationView):
    email_body_template = 'registration/activation_email.txt'
    email_subject_template = 'registration/activation_email_subject.txt'
    email_html_template = 'registration/activation_email.html'
    form_class = RegistrationForm

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
