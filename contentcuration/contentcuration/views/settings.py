import json
import math
import os
from datetime import date, timedelta
from django.shortcuts import render, redirect
from django.conf import settings as ccsettings
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.contrib.auth import views, update_session_auth_hash
from django.contrib.auth.mixins import LoginRequiredMixin
from django.contrib.sites.shortcuts import get_current_site
from django.core.mail import send_mail
from django.db.models import Count
from django.http import HttpResponse, HttpResponseBadRequest, HttpResponseForbidden
from django.template.loader import render_to_string
from django.utils.translation import ugettext as _
from django.views.generic.edit import FormView
from contentcuration.forms import ProfileSettingsForm, AccountSettingsForm, PreferencesSettingsForm, PolicyAcceptForm, StorageRequestForm
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view
from django.core.urlresolvers import reverse_lazy
from contentcuration.decorators import browser_is_supported, has_accepted_policies
from contentcuration.models import Channel, License
from contentcuration.tasks import generateusercsv_task
from contentcuration.utils.csv_writer import generate_user_csv_filename
from contentcuration.utils.policies import get_latest_policies


@login_required
@browser_is_supported
@has_accepted_policies
def settings(request):
    if not request.user.is_authenticated():
        return redirect('accounts/login')
    return redirect('settings/profile')


class ProfileView(FormView, LoginRequiredMixin):
    """
    Base class for user settings views.
    """
    success_url = reverse_lazy('profile_settings')
    form_class = ProfileSettingsForm
    template_name = 'settings/profile.html'

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


class PreferencesView(FormView, LoginRequiredMixin):
    """
    Base class for user settings views.
    """
    success_url = reverse_lazy('preferences_settings')
    form_class = PreferencesSettingsForm
    template_name = 'settings/preferences.html'

    def get_context_data(self, **kwargs):
        context = super(PreferencesView, self).get_context_data(**kwargs)
        context.update({"page": "preferences", "success": False})
        return context

    def get_initial(self):

        initial = self.initial.copy()
        initial.update(json.loads(self.request.user.preferences))
        initial.update({
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

class PolicyAcceptView(FormView, LoginRequiredMixin):
    success_url = reverse_lazy('channels')
    form_class = PolicyAcceptForm
    template_name = 'policies/policy_accept.html'

    def get_context_data(self, **kwargs):
        kwargs = super(PolicyAcceptView, self).get_context_data(**kwargs)
        policies = json.loads(self.request.session.get('policies', "[]"))
        kwargs.update({"policies": policies})
        return kwargs

    def form_valid(self, form):
        form.save(self.request.user)
        self.request.session["policies"] = None
        return redirect(self.success_url)


@login_required
def account_settings(request):
    if request.method == 'POST':
        form = AccountSettingsForm(request.user, request.POST)
        if form.is_valid():
            user = form.save()
            update_session_auth_hash(request, user)
    else:
        form = AccountSettingsForm(request.user)
        
    channels = [ # Count on editors is always returning 1, so iterate manually
        {"name": c.name, "id": c.id}
        for c in request.user.editable_channels.filter(deleted=False)
        if c.editors.count() == 1
    ]

    return render(request, 'settings/account.html', {
        "form": form,
        "current_user": request.user,
        "page": "account",
        "channels": channels,
        "policy_email": ccsettings.POLICY_EMAIL,
    })


@login_required
@api_view(['POST'])
def delete_user_account(request, user_email):
    if request.user.email != user_email:
        return HttpResponseForbidden(_("Cannot delete another user's account"))
    elif request.user.is_admin or request.user.is_staff:
        return HttpResponseBadRequest(_("Cannot delete admin accounts"))

    # Send email to notify team about account being deleted
    buffer_date  = (date.today()+timedelta(days=ccsettings.ACCOUNT_DELETION_BUFFER)).strftime('%A, %B %d %Y')
    subject = "Kolibri Studio Account Deleted"
    message = render_to_string('settings/account_deleted_notification_email.txt', {"user": request.user, "buffer_date": buffer_date})
    send_mail(subject, message, ccsettings.DEFAULT_FROM_EMAIL, [ccsettings.REGISTRATION_INFORMATION_EMAIL])

    # Send email to user regarding account deletion
    site = get_current_site(request)
    subject = _("Kolibri Studio Account Deleted")
    message = render_to_string('settings/account_deleted_user_email.txt', {
        "user": request.user,
        "buffer_date": buffer_date,
        "legal_email": ccsettings.POLICY_EMAIL,
        "num_days": ccsettings.ACCOUNT_DELETION_BUFFER,
        "site_name": site and site.name,
    })
    send_mail(subject, message, ccsettings.DEFAULT_FROM_EMAIL, [ccsettings.REGISTRATION_INFORMATION_EMAIL])

    # Delete user, any previously deleted channels, and csvs
    for c in request.user.editable_channels.all():
        if c.editors.count() == 1:
            c.delete()

    csv_path = generate_user_csv_filename(request.user) # Remove any generated csvs
    if os.path.exists(csv_path):
        os.unlink(csv_path)

    request.user.delete()

    return HttpResponse({"success" : True })

@login_required
@api_view(['POST'])
def export_user_data(request, user_email):
    if request.user.email != user_email:
        return HttpResponseForbidden(_("Cannot export another user's data"))
    generateusercsv_task.delay(user_email)
    return HttpResponse({"success" : True })

def account_deleted(request):
    return render(request, "settings/account_deleted.html")


@login_required
def tokens_settings(request):
    user_token, isNew = Token.objects.get_or_create(user=request.user)
    return render(request, 'settings/tokens.html', {"current_user": request.user,
                                                    "page": "tokens",
                                                    "tokens": [str(user_token)]})

@login_required
def policies_settings(request):
    return render(request, 'settings/policy.html', {"current_user": request.user,
                                                    "page": "policies",
                                                    "policies": get_latest_policies()})


class StorageSettingsView(FormView, LoginRequiredMixin):
    success_url = reverse_lazy('storage_settings')
    template_name = 'settings/storage.html'
    form_class = StorageRequestForm

    def get_form_kwargs(self):
        kw = super(StorageSettingsView, self).get_form_kwargs()
        kw['channel_choices'] = [(c['id'], c['name']) for c in self.request.user.editable_channels.values("id", "name")]
        return kw

    def post(self, request):
        form = self.get_form()
        if form.is_valid():
            # Send email with storage request
            channel_ids = form.cleaned_data.get("public") or ""
            channels = Channel.objects.filter(pk__in=channel_ids.split(',')).values('id', 'name')
            message = render_to_string('settings/storage_request_email.txt', {"data": form.cleaned_data, "user": self.request.user, "channels": channels})
            send_mail(_("Kolibri Studio Storage Request"), message, ccsettings.DEFAULT_FROM_EMAIL, [ccsettings.SPACE_REQUEST_EMAIL, self.request.user.email])

            return self.form_valid(form)
        else:
            return self.form_invalid(form)

    def get_context_data(self, **kwargs):
        kwargs = super(StorageSettingsView, self).get_context_data(**kwargs)

        storage_used = self.request.user.get_space_used()
        storage_percent = (min(storage_used / float(self.request.user.disk_space), 1) * 100)
        breakdown = [{
                        "name": k.capitalize(),
                        "size":"%.2f" % (float(v)/1048576),
                        "percent": "%.2f" % (min(float(v) / float(self.request.user.disk_space), 1) * 100)
                    } for k,v in self.request.user.get_space_used_by_kind().items()]

        kwargs.update( {
            "current_user": self.request.user,
            "page": "storage",
            "percent_used": "%.2f" % storage_percent,
            "used": "%.2f" % (float(storage_used) / 1048576),
            "total": "%.2f" % (float(self.request.user.disk_space) / 1048576),
            "available": "%.2f" % (self.request.user.get_available_space() / 1048576),
            "breakdown": breakdown,
            "request_email": ccsettings.SPACE_REQUEST_EMAIL,
            "channel_count": self.request.user.editable_channels.count(),
        })
        return kwargs

    def form_valid(self, form):
        messages.add_message(self.request, messages.INFO, _("Your storage request has been submitted for processing"))
        return super(StorageSettingsView, self).form_valid(form)
