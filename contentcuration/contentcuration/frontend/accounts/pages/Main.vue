<template>

  <VApp>
    <VLayout
      fill-height
      justify-center
      class="pt-5 main"
    >
      <div>
        <VCard class="pa-4" style="min-width: 300px;">
          <VImg
            height="200"
            maxHeight="100"
            contain
            :lazy-src="require('shared/images/kolibri-logo.svg')"
            :src="require('shared/images/kolibri-logo.svg')"
          />
          <h2 class="text-xs-center primary--text">
            {{ $tr('kolibriStudio') }}
          </h2>
          <Banner :value="loginFailed" :text="$tr('loginFailed')" error class="mb-4" />
          <VForm ref="form" lazy-validation class="py-4" @submit.prevent="submit">
            <EmailField v-model="username" autofocus />
            <PasswordField v-model="password" :label="$tr('passwordLabel')" />
            <p>
              <ActionLink :to="{name: 'ForgotPassword' }" :text="$tr('forgotPasswordLink')" />
            </p>
            <VBtn block color="primary" large type="submit">
              {{ $tr('signInButton') }}
            </VBtn>
            <VBtn block flat color="primary" class="mt-2" :to="{name: 'Create'}">
              {{ $tr('createAccountButton') }}
            </VBtn>
          </VForm>
          <VDivider />
          <p class="text-xs-center mt-4">
            <ActionLink href="/channels" :text="$tr('guestModeLink')" />
          </p>
        </VCard>
        <p class="text-xs-center mt-5 links">
          <span>
            <ActionLink
              :text="$tr('privacyPolicyLink')"
              @click="showPrivacyPolicy = true"
            />
            <PrivacyPolicyModal v-model="showPrivacyPolicy" />
          </span>
          <span>
            <ActionLink
              :text="$tr('TOSLink')"
              @click="showTermsOfService = true"
            />
            <TermsOfServiceModal v-model="showTermsOfService" />
          </span>
        </p>
      </div>
    </VLayout>
  </VApp>

</template>


<script>

  import { mapActions } from 'vuex';
  import EmailField from 'shared/views/form/EmailField';
  import PasswordField from 'shared/views/form/PasswordField';
  import Banner from 'shared/views/Banner';
  import PrivacyPolicyModal from 'shared/views/policies/PrivacyPolicyModal';
  import TermsOfServiceModal from 'shared/views/policies/TermsOfServiceModal';

  export default {
    name: 'Main',
    components: {
      EmailField,
      PasswordField,
      Banner,
      PrivacyPolicyModal,
      TermsOfServiceModal,
    },
    data() {
      return {
        username: '',
        password: '',
        loginFailed: false,
        showPrivacyPolicy: false,
        showTermsOfService: false,
      };
    },
    methods: {
      ...mapActions(['login']),
      submit() {
        if (this.$refs.form.validate()) {
          let credentials = {
            username: this.username,
            password: this.password,
          };
          return this.login(credentials)
            .then(() => {
              let params = new URLSearchParams(window.location.href.split('?')[1]);
              window.location.assign(params.get('next') || '/channels');
            })
            .catch(err => {
              if (err.response.status === 405) {
                this.$router.push({ name: 'AccountNotActivated' });
              }
              this.loginFailed = true;
            });
        }
        return Promise.resolve();
      },
    },
    $trs: {
      kolibriStudio: 'Kolibri Studio',
      passwordLabel: 'Password',
      forgotPasswordLink: 'Forgot your password?',
      signInButton: 'Sign in',
      createAccountButton: 'Create an account',
      guestModeLink: 'Explore without an account',
      loginFailed: 'Email or password is incorrect',
      privacyPolicyLink: 'Privacy policy',
      TOSLink: 'Terms of service',
    },
  };

</script>


<style lang="less" scoped>

  .main {
    background-color: var(--v-backgroundColor-base);
  }

  .links span:not(:last-child)::after {
    margin: 0 8px;
    font-size: 14pt;
    color: var(--v-grey-base);
    vertical-align: middle;
    content: '•';
  }

</style>
