import json
from django.shortcuts import render, redirect
from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.contrib.auth import views
from django.views.generic.edit import FormView
from contentcuration.forms import ProfileSettingsForm, AccountSettingsForm, PreferencesSettingsForm
from rest_framework.authtoken.models import Token
from django.core.urlresolvers import reverse_lazy
from contentcuration.api import check_supported_browsers


@login_required
def settings(request):
    if not check_supported_browsers(request.META['HTTP_USER_AGENT']):
        return redirect(reverse_lazy('unsupported_browser'))
    if not request.user.is_authenticated():
        return redirect('accounts/login')
    return redirect('settings/profile')


class ProfileView(FormView):
    """
    Base class for user settings views.
    """
    success_url = reverse_lazy('profile_settings')
    form_class = ProfileSettingsForm
    template_name = 'settings/profile.html'

    def get(self, request, *args, **kwargs):
        if not self.request.user.is_authenticated():
            return redirect('/accounts/login')
        return super(ProfileView, self).get(request, *args, **kwargs)

    def get_context_data(self, **kwargs):
        context = super(ProfileView, self).get_context_data(**kwargs)
        context.update({"page": "profile", 'channel_name': False, "success": False})
        return context

    def get_initial(self):
        initial = self.initial.copy()
        initial.update({'first_name': self.request.user.first_name, 'last_name': self.request.user.last_name})
        return initial

    def form_valid(self, form):
        form.save(self.request.user)
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

    def get(self, request, *args, **kwargs):
        if not self.request.user.is_authenticated():
            return redirect('/accounts/login')
        return super(PreferencesView, self).get(request, *args, **kwargs)

    def get_context_data(self, **kwargs):
        context = super(PreferencesView, self).get_context_data(**kwargs)
        context.update({"page": "preferences", "success": False})
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
        form.save(self.request.user)
        context = self.get_context_data(form=form)
        context.update({'success': True})
        return self.render_to_response(context)

    def form_invalid(self, form):
        return self.render_to_response(self.get_context_data(form=form))

    def user(self):
        return self.request.user


@login_required
def account_settings(request):
    if not request.user.is_authenticated():
        return redirect('/accounts/login')
    return views.password_change(
        request,
        template_name='settings/account.html',
        post_change_redirect=reverse_lazy('account_settings_success'),
        password_change_form=AccountSettingsForm,
        extra_context={"current_user": request.user, "page": "account"}
    )


@login_required
def account_settings_success(request):
    return views.password_change(
        request,
        template_name='settings/account_success.html',
        post_change_redirect=reverse_lazy('account_settings_success'),
        password_change_form=AccountSettingsForm,
        extra_context={"current_user": request.user, "page": "account"}
    )


@login_required
def tokens_settings(request):
    if not request.user.is_authenticated():
        return redirect('/accounts/login')
    user_token, isNew = Token.objects.get_or_create(user=request.user)
    return render(request, 'settings/tokens.html', {"current_user": request.user,
                                                    "page": "tokens",
                                                    "tokens": [str(user_token)]})
