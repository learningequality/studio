<template>

  <VApp>
    <VLayout
      fill-height
      justify-center
      class="main pt-5"
    >
      <div>
        <!-- Sign in -->
        <VCard
          class="pa-4"
          style="width: 300px; margin: 0 auto"
        >
          <div class="k-logo-container">
            <KLogo
              altText="Kolibri Logo with background"
              :showBackground="true"
              :size="120"
            />
          </div>
          <h2 class="primary--text py-2 text-xs-center">
            {{ $tr('kolibriStudio') }}
          </h2>
          <Banner
            :value="loginFailed"
            :text="$tr('loginFailed')"
            error
          />
          <Banner
            :value="offline"
            :text="$tr('loginFailedOffline')"
            error
          />
          <Banner
            :value="Boolean(nextParam)"
            :text="$tr('loginToProceed')"
            class="pb-0 px-0"
            data-test="loginToProceed"
          />
          <VForm
            ref="form"
            lazy-validation
            class="py-3"
            @submit.prevent="submit"
          >
            <EmailField
              v-model="username"
              autofocus
            />
            <PasswordField
              v-model="password"
              :label="$tr('passwordLabel')"
            />
            <p>
              <ActionLink
                :to="{ name: 'ForgotPassword' }"
                :text="$tr('forgotPasswordLink')"
              />
            </p>
            <KButton
              primary
              class="w-100"
              :text="$tr('signInButton')"
              :disabled="offline || busy"
              type="submit"
            />
            <KRouterLink
              primary
              class="mt-2 w-100"
              :text="$tr('createAccountButton')"
              :to="{ name: 'Create' }"
              appearance="flat-button"
            />
          </VForm>
          <VDivider />
          <p class="mt-4 text-xs-center">
            <ActionLink
              href="/channels"
              :text="$tr('guestModeLink')"
            />
          </p>
        </VCard>

        <!-- Footer -->
        <LanguageSwitcherList class="mt-3 text-xs-center" />

        <p class="links mt-3 text-xs-center">
          <span>
            <ActionLink
              :text="$tr('privacyPolicyLink')"
              @click="showPrivacyPolicy"
            />
          </span>
          <span>
            <ActionLink
              :text="$tr('TOSLink')"
              @click="showTermsOfService"
            />
          </span>
          <span>
            <ActionLink
              :text="$tr('copyright', { year: new Date().getFullYear() })"
              href="https://learningequality.org/"
              target="_blank"
            />
          </span>
        </p>
      </div>
    </VLayout>
    <PolicyModals />
  </VApp>

</template>


<script>

  import { mapActions, mapState } from 'vuex';
  import EmailField from 'shared/views/form/EmailField';
  import PasswordField from 'shared/views/form/PasswordField';
  import Banner from 'shared/views/Banner';
  import PolicyModals from 'shared/views/policies/PolicyModals';
  import { policies } from 'shared/constants';
  import LanguageSwitcherList from 'shared/languageSwitcher/LanguageSwitcherList';

  export default {
    name: 'AccountsMain',
    components: {
      Banner,
      EmailField,
      LanguageSwitcherList,
      PasswordField,
      PolicyModals,
    },
    data() {
      return {
        username: '',
        password: '',
        loginFailed: false,
        busy: false,
        loginFailedOffline: false,
      };
    },
    computed: {
      ...mapState({
        offline: state => !state.connection.online,
      }),
      nextParam() {
        const params = new URLSearchParams(window.location.search.substring(1));
        return params.get('next');
      },
    },
    methods: {
      ...mapActions(['login']),
      showTermsOfService() {
        this.$router.push({ query: { showPolicy: policies.TERMS_OF_SERVICE } });
      },
      showPrivacyPolicy() {
        this.$router.push({ query: { showPolicy: policies.PRIVACY } });
      },
      submit() {
        if (this.$refs.form.validate()) {
          this.busy = true;
          const credentials = {
            username: this.username,
            password: this.password,
          };
          return this.login(credentials)
            .then(() => {
              this.loginFailedOffline = false;
              this.loginFailed = false;
              window.location.assign(this.nextParam || window.Urls.channels());
            })
            .catch(err => {
              this.busy = false;
              if (err.message === 'Network Error') {
                this.loginFailedOffline = true;
              } else if (err.response.status === 405) {
                this.$router.push({ name: 'AccountNotActivated' });
              } else {
                this.loginFailed = true;
              }
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
      copyright: '© {year} Learning Equality',
      loginToProceed: 'You must sign in to view that page',
      loginFailedOffline:
        'You seem to be offline. Please connect to the internet before signing in.',
    },
  };

</script>


<style lang="scss" scoped>

  .main {
    overflow: auto;
    /* stylelint-disable-next-line custom-property-pattern */
    background-color: var(--v-backgroundColor-base);
  }

  .links {
    span {
      &:not(:last-child)::after {
        margin: 0 8px 0 12px;
        font-size: 14pt;
        color: var(--v-grey-base);
        vertical-align: middle;
        content: '•';
      }
    }
  }

  .w-100 {
    width: 100%;
  }

  .k-logo-container {
    display: flex;
    justify-content: center;
  }

</style>
