from contentcuration.models import User
from django import forms
from django.utils.translation import ugettext as _
from django.contrib.auth import get_user_model
from django.contrib.auth.forms import UserCreationForm

class RegistrationForm(UserCreationForm):
    password1 = forms.CharField(widget=forms.PasswordInput, label='Password', required=True)
    password2 = forms.CharField(widget=forms.PasswordInput, label='Password (again)', required=True)

    class Meta:
        model = User
        fields = ('first_name', 'last_name', 'email', 'password1', 'password2')

    def clean_email(self):
        email = self.cleaned_data['email'].strip()
        try:
            User.objects.get(email__iexact=email)
            self.add_error('email', 'Email already exists.')
        except User.DoesNotExist:
            return email

    def clean(self):
        cleaned_data = super(RegistrationForm, self).clean()

        self.check_field('email', 'Email is required.')
        self.check_field('first_name', 'First name is required.')
        self.check_field('last_name', 'Last name is required.')

        if self.check_field('password1', 'Password is required.'):
            if 'password2' not in self.cleaned_data or self.cleaned_data['password1'] != self.cleaned_data['password2']:
                self.errors['password2'] = self.error_class()
                self.add_error('password2', 'Passwords don\'t match.')
        else:
            self.errors['password2'] = self.error_class()

        return self.cleaned_data

    def check_field(self, field, error):
        if field not in self.cleaned_data:
            self.errors[field] = self.error_class()
            self.add_error(field, error)
            return False
        return True


class InvitationForm(UserCreationForm):
    password1 = forms.CharField(widget=forms.PasswordInput, label='Password', required=True)
    password2 = forms.CharField(widget=forms.PasswordInput, label='Password (again)', required=True)

    class Meta:
        model = User
        fields = ('first_name', 'last_name', 'password1', 'password2')

    def clean(self):
        cleaned_data = super(InvitationForm, self).clean()

        self.check_field('first_name', 'First name is required.')
        self.check_field('last_name', 'Last name is required.')

        if self.check_field('password1', 'Password is required.'):
            if 'password2' not in self.cleaned_data or self.cleaned_data['password1'] != self.cleaned_data['password2']:
                self.errors['password2'] = self.error_class()
                self.add_error('password2', 'Passwords don\'t match.')
        else:
            self.errors['password2'] = self.error_class()

        return self.cleaned_data

    def check_field(self, field, error):
        if field not in self.cleaned_data:
            self.errors[field] = self.error_class()
            self.add_error(field, error)
            return False
        return True

    def save(self, user):
        user.set_password(self.cleaned_data["password1"])
        user.first_name = self.cleaned_data["first_name"]
        user.last_name = self.cleaned_data["last_name"]
        user.is_active=True

        user.save()
        return user