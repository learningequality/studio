import copy
import json
import logging
import re
from django.http import Http404, HttpResponse, HttpResponseBadRequest, HttpResponseRedirect
from django.views.decorators.csrf import csrf_exempt
from django.views.generic.edit import FormView
from django.shortcuts import render, get_object_or_404, redirect, render_to_response
from django.contrib.sites.shortcuts import get_current_site
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.conf import settings
from django.core.exceptions import ObjectDoesNotExist
from django.core.context_processors import csrf
from django.db.models import Q
from django.template.loader import render_to_string
from contentcuration.models import Channel, User, Invitation
from contentcuration.forms import InvitationForm, InvitationAcceptForm, RegistrationForm
from registration.backends.hmac.views import RegistrationView


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
            retrieved_user = User.objects.get_or_create(email = user_email)
            recipient = retrieved_user[0]
            channel = Channel.objects.get(id=channel_id)
            invitation = Invitation.objects.get_or_create(invited = recipient,
                                                        email = user_email,
                                                        sender=request.user,
                                                        channel_id = channel_id,
                                                        first_name=recipient.first_name if recipient.is_active else "Guest",
                                                        last_name=recipient.last_name if recipient.is_active else " ")[0]
            ctx_dict = {    'sender' : request.user,
                            'site' : get_current_site(request),
                            'user' : recipient,
                            'channel_id' : channel_id,
                            'invitation_key': invitation.id,
                            'is_new': recipient.is_active is False,
                            'channel': channel.name
                        }
            subject = render_to_string('permissions/permissions_email_subject.txt', ctx_dict)
            message = render_to_string('permissions/permissions_email.txt', ctx_dict)
            # message_html = render_to_string('permissions/permissions_email.html', ctx_dict)
            recipient.email_user(subject, message, settings.DEFAULT_FROM_EMAIL,) #html_message=message_html,)
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
            }))

class InvitationAcceptView(FormView):
    form_class = InvitationAcceptForm
    template_name = 'permissions/permissions_confirm.html'
    invitation = None

    def get_initial(self):
        initial = self.initial.copy()
        return {'userid': self.kwargs["user_id"]}

    def get_form_kwargs(self):
        kwargs = super(InvitationAcceptView, self).get_form_kwargs()
        kwargs.update({'user': self.user()})
        return kwargs

    def get_success_url(self):
        return "/channels/" + self.kwargs["channel_id"] + "/edit"

    def dispatch(self, *args, **kwargs):
        user = self.user()
        try:
            self.invitation = Invitation.objects.get(id = self.kwargs['invitation_link'])
        except ObjectDoesNotExist:
            logging.debug("No invitation found.")
            channel = Channel.objects.get(id=self.kwargs["channel_id"])
            if user in channel.editors.all():
                return super(InvitationAcceptView, self).dispatch(*args, **kwargs)
            return redirect("/invitation_fail")

        return super(InvitationAcceptView, self).dispatch(*args, **kwargs)

    def user(self):
        return User.objects.get_or_create(id=self.kwargs["user_id"])[0]

    def form_valid(self, form):
        channel = Channel.objects.get(id=self.kwargs["channel_id"])
        user = self.user()
        if user not in channel.editors.all():
            channel.editors.add(user)
            channel.save()
            if self.invitation is not None:
                self.invitation.delete()

        user_cache = authenticate(username=user.email,
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
        return "/accept_invitation/" + self.kwargs["user_id"] + "/" + self.kwargs["invitation_link"] + "/" + self.kwargs["channel_id"]

    def get_login_url(self):
        return "/channels/" + self.kwargs["channel_id"] + "/edit"

    def dispatch(self, *args, **kwargs):
        user = self.user()
        try:
            self.invitation = Invitation.objects.get(id__exact = self.kwargs['invitation_link'])
        except ObjectDoesNotExist:
            logging.debug("No invitation found.")
            channel = Channel.objects.get(id=self.kwargs["channel_id"])
            if user in channel.editors.all():
                return redirect(self.get_success_url())
            return redirect("/invitation_fail")

        if not getattr(settings, 'REGISTRATION_OPEN', True):
            return redirect(self.disallowed_url)

        if user.is_active:
            return redirect(self.get_success_url())

        return super(InvitationRegisterView, self).dispatch(*args, **kwargs)

    def form_valid(self, form):
        user = form.save(self.user())
        channel = Channel.objects.get(id=self.kwargs["channel_id"])
        if user not in channel.editors.all():
            channel.editors.add(user)
            channel.save()
            if self.invitation is not None:
                self.invitation.delete()
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
        invitation = Invitation.objects.get(id = invitation_link)
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
    form_class=RegistrationForm

    def send_activation_email(self, user):
        activation_key = self.get_activation_key(user)
        context = self.get_email_context(activation_key)
        context.update({
            'user': user
        })
        subject = render_to_string(self.email_subject_template, context)
        subject = ''.join(subject.splitlines())
        message = render_to_string(self.email_body_template, context)
        # message_html = render_to_string(self.email_html_template, context)
        user.email_user(subject, message, settings.DEFAULT_FROM_EMAIL, ) #html_message=message_html,)

