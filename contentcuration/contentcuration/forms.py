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

# class PassworResetForm(forms.Form):
#     error_messages = {
#         'unknown': ("That email address doesn't have an associated "
#                      "user account. Are you sure you've registered?"),
#         'unusable': ("The user account associated with this email "
#                       "address cannot reset the password."),
#         }
#     def clean_email(self):
#         """
#         Validates that an active user exists with the given email address.
#         """
#         UserModel = get_user_model()
#         email = self.cleaned_data["email"]
#         self.users_cache = UserModel._default_manager.filter(email__iexact=email)
#         if not len(self.users_cache):
#             raise forms.ValidationError(self.error_messages['unknown'])
#         if not any(user.is_active for user in self.users_cache):
#             # none of the filtered users are active
#             raise forms.ValidationError(self.error_messages['unknown'])
#         if any((user.password == UNUSABLE_PASSWORD)
#             for user in self.users_cache):
#             raise forms.ValidationError(self.error_messages['unusable'])
#         return email

#     def save(self, domain_override=None,
#              subject_template_name='registration/password_reset_subject.txt',
#              email_template_name='registration/reset_password_email.html',
#              use_https=False, token_generator=default_token_generator,
#              from_email=None, request=None):
#         """
#         Generates a one-use only link for resetting password and sends to the
#         user.
#         """
#         from django.core.mail import send_mail
#         for user in self.users_cache:
#             if not domain_override:
#                 current_site = get_current_site(request)
#                 site_name = current_site.name
#                 domain = current_site.domain
#             else:
#                 site_name = domain = domain_override
#             c = {
#                 'email': user.email,
#                 'domain': domain,
#                 'site_name': site_name,
#                 'uid': int_to_base36(user.pk),
#                 'user': user,
#                 'token': token_generator.make_token(user),
#                 'protocol': use_https and 'https' or 'http',
#                 }
#             subject = loader.render_to_string(subject_template_name, c)
#             # Email subject *must not* contain newlines
#             subject = ''.join(subject.splitlines())
#             email = loader.render_to_string(email_template_name, c)
#             send_mail(subject, email, from_email, [user.email])