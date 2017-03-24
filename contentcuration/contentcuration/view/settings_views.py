import json
import requests
from django.http import Http404, HttpResponse, HttpResponseBadRequest, HttpResponseRedirect
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import render, get_object_or_404, redirect, render_to_response
from django.contrib.sites.shortcuts import get_current_site
from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.contrib.auth import views
from django.core.exceptions import ObjectDoesNotExist
from django.views.generic.edit import FormView
from django.core.context_processors import csrf
from django.db.models import Q
from django.template.loader import render_to_string
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.renderers import JSONRenderer
from contentcuration.models import User, Channel
from contentcuration.forms import ProfileSettingsForm, AccountSettingsForm, PreferencesSettingsForm
from rest_framework.authtoken.models import Token
from django.core.urlresolvers import reverse_lazy
import contentcuration.urls
from contentcuration.api import check_supported_browsers


@login_required
def settings(request):
    if not check_supported_browsers(request.META['HTTP_USER_AGENT']):
        return redirect(reverse_lazy('unsupported_browser'))
    return redirect('settings/profile')

class ProfileView(FormView):
    """
    Base class for user settings views.
    """
    success_url = reverse_lazy('profile_settings')
    form_class = ProfileSettingsForm
    template_name = 'settings/profile.html'

    def get_context_data(self, **kwargs):
        context = super(ProfileView, self).get_context_data(**kwargs)
        context.update({"page": "profile", 'channel_name': False, "success":False})
        return context

    def get_initial(self):
        initial = self.initial.copy()
        initial.update({'first_name': self.request.user.first_name, 'last_name': self.request.user.last_name})
        return initial

    def form_valid(self, form):
        user = form.save(self.user())
        context = self.get_context_data(form=form)
        context.update({'success': True})
        return self.render_to_response(context)

    def form_invalid(self, form):
        return self.render_to_response(self.get_context_data(form=form))

    def user(self):
        return self.request.user


class PreferencesView(FormView):
    """
    Base class for user settings views.
    """
    success_url = reverse_lazy('preferences_settings')
    form_class = PreferencesSettingsForm
    template_name = 'settings/preferences.html'

    def get_context_data(self, **kwargs):
        context = super(PreferencesView, self).get_context_data(**kwargs)
        context.update({"page": "preferences", "success":False})
        return context

    def get_initial(self):
        initial = self.initial.copy()
        initial.update(json.loads(self.request.user.preferences))
        initial.update({
            'author': initial.get('author') or self.request.user.get_full_name(),
            'm_value': initial.get('m_value') or 1,
            'n_value': initial.get('n_value') or 1,
        })
        return initial

    def form_valid(self, form):
        user = form.save(self.user())
        context = self.get_context_data(form=form)
        context.update({'success': True})
        return self.render_to_response(context)

    def form_invalid(self, form):
        return self.render_to_response(self.get_context_data(form=form))

    def user(self):
        return self.request.user


@login_required
def account_settings(request):
    return views.password_change(request,
        template_name='settings/account.html',
        post_change_redirect=reverse_lazy('account_settings_success'),
        password_change_form=AccountSettingsForm,
        extra_context={"current_user" : request.user, "page": "account"}
    )

@login_required
def account_settings_success(request):
    return views.password_change(request,
        template_name='settings/account_success.html',
        post_change_redirect=reverse_lazy('account_settings_success'),
        password_change_form=AccountSettingsForm,
        extra_context={"current_user" : request.user, "page": "account"}
    )

@login_required
def tokens_settings(request):
    user_token, isNew = Token.objects.get_or_create(user=request.user)
    return render(request, 'settings/tokens.html', {"current_user" : request.user,
                                                    "page": "tokens",
                                                    "tokens":[str(user_token)]})
