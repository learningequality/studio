<template>

  <!--
    theme--light is load-bearing: Vuetify 1.5 (still active via VApp on other
    account pages, e.g. MessageLayout.vue) generates a global .link background
    rule that collides with the basic-link KButtons below. It's only
    neutralised under .theme--light in shared/styles/main.scss. Remove this
    only once that rule is un-nested there.
  -->
  <div
    class="page theme--light"
    :style="{ backgroundColor: $themePalette.grey.v_100 }"
  >
    <div>
      <!-- Sign in -->
      <StudioRaisedBox class="sign-in-card">
        <template #header>
          <div class="k-logo-container">
            <KLogo
              altText="Kolibri Logo with background"
              :showBackground="true"
              :size="120"
            />
          </div>
          <h1
            class="notranslate page-title"
            :style="{ color: $themeTokens.primary }"
          >
            {{ $tr('kolibriStudio') }}
          </h1>
        </template>
        <template #main>
          <div class="card-body">
            <StudioBanner
              v-if="loginFailed"
              role="alert"
              error
            >
              {{ $tr('loginFailed') }}
            </StudioBanner>
            <StudioBanner
              v-if="offline"
              role="alert"
              error
            >
              {{ $tr('loginFailedOffline') }}
            </StudioBanner>
            <StudioBanner
              v-if="nextParam"
              data-test="loginToProceed"
            >
              {{ $tr('loginToProceed') }}
            </StudioBanner>
            <form
              class="form"
              @submit.prevent="submit"
            >
              <StudioEmailField
                v-model="username"
                autofocus
                :errorMessages="touched.username && errors.username ? [usernameErrorText] : []"
                :appearanceOverrides="{ maxWidth: '100%' }"
                @blur="touched.username = true"
              />
              <StudioPasswordField
                v-model="password"
                :errorMessages="touched.password && errors.password ? [passwordErrorText] : []"
                :appearanceOverrides="{ maxWidth: '100%' }"
                @blur="touched.password = true"
              />
              <p>
                <KRouterLink
                  :to="{ name: 'ForgotPassword' }"
                  :text="$tr('forgotPasswordLink')"
                  appearance="basic-link"
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
                class="create-account-link w-100"
                :text="$tr('createAccountButton')"
                :to="{ name: 'Create' }"
                appearance="flat-button"
              />
            </form>
            <hr
              class="divider"
              :style="{ borderTopColor: $themeTokens.fineLine }"
            >
            <p class="guest-link">
              <KButton
                href="/channels/#public"
                :text="$tr('guestModeLink')"
                appearance="basic-link"
              />
            </p>
          </div>
        </template>
      </StudioRaisedBox>

      <!-- Footer -->
      <LanguageSwitcherList class="language-switcher" />

      <p
        class="links"
        :style="{ color: $themePalette.grey.v_700 }"
      >
        <span>
          <KButton
            :text="$tr('privacyPolicyLink')"
            appearance="basic-link"
            @click="showPrivacyPolicy"
          />
        </span>
        <span>
          <KButton
            :text="$tr('TOSLink')"
            appearance="basic-link"
            @click="showTermsOfService"
          />
        </span>
        <span>
          <KButton
            href="https://learningequality.org/"
            :text="$tr('copyright', { year: new Date().getFullYear() })"
            appearance="basic-link"
            iconAfter="openNewTab"
            target="_blank"
          />
        </span>
      </p>
    </div>
    <PolicyModals />
  </div>

</template>


<script>

  import { mapActions, mapState } from 'vuex';
  import StudioEmailField from '../components/form/StudioEmailField';
  import StudioPasswordField from '../components/form/StudioPasswordField';
  import PolicyModals from 'shared/views/policies/PolicyModals';
  import StudioBanner from 'shared/views/StudioBanner';
  import StudioRaisedBox from 'shared/views/StudioRaisedBox';
  import LanguageSwitcherList from 'shared/languageSwitcher/LanguageSwitcherList';
  import { policies } from 'shared/constants';
  import commonStrings from 'shared/translator';
  import { generateFormMixin } from 'shared/mixins';
  import { redirectBrowser } from 'shared/utils/navigation';

  const formMixin = generateFormMixin({
    username: {
      required: true,
      validator: v => Boolean(v && v.trim()) && /.+@.+\..+/.test(v),
    },
    password: {
      required: true,
    },
  });

  export default {
    name: 'AccountsMain',
    components: {
      LanguageSwitcherList,
      PolicyModals,
      StudioBanner,
      StudioEmailField,
      StudioPasswordField,
      StudioRaisedBox,
    },
    mixins: [formMixin],
    data() {
      return {
        loginFailed: false,
        busy: false,
        // Gates error display until blur, since formMixin's setters otherwise
        // mark errors on every keystroke. Create.vue has no equivalent gate,
        // so the two forms validate differently; epic-level decision tracked
        // on #5060.
        touched: {
          username: false,
          password: false,
        },
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
      usernameErrorText() {
        if (!this.username || !this.username.trim()) {
          /* eslint-disable-next-line kolibri/vue-no-undefined-string-uses */
          return commonStrings.$tr('fieldRequired');
        }
        return this.$tr('validEmailMessage');
      },
      passwordErrorText() {
        /* eslint-disable-next-line kolibri/vue-no-undefined-string-uses */
        return commonStrings.$tr('fieldRequired');
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
      // eslint-disable-next-line vue/no-unused-properties
      onValidationFailed() {
        this.touched.username = true;
        this.touched.password = true;
        this.$nextTick(() => {
          const selector = this.errors.username ? 'input[type="email"]' : 'input[type="password"]';
          const firstInvalidInput = this.$el.querySelector(selector);
          if (firstInvalidInput) {
            firstInvalidInput.focus();
          }
        });
      },
      // eslint-disable-next-line vue/no-unused-properties
      onSubmit(formData) {
        this.busy = true;
        // formMixin's clean() trims every field, including password, before
        // building formData. Reading the untrimmed this.password here (not
        // formData.password) preserves leading/trailing spaces the user typed.
        const credentials = {
          username: formData.username,
          password: this.password,
        };
        return this.login(credentials)
          .then(() => {
            this.loginFailed = false;
            redirectBrowser(this.nextParam || window.Urls.channels());
          })
          .catch(err => {
            this.busy = false;
            if (err.message === 'Network Error') {
              // The offline banner is driven by state.connection.online via
              // the offline computed property, so no local flag is needed here.
              return;
            }
            if (err.response.status === 405) {
              this.$router.push({ name: 'AccountNotActivated' });
            } else {
              this.loginFailed = true;
            }
          });
      },
    },
    $trs: {
      kolibriStudio: 'Kolibri Studio',
      forgotPasswordLink: 'Forgot your password?',
      signInButton: 'Sign in',
      createAccountButton: 'Create an account',
      guestModeLink: 'Explore without an account',
      loginFailed: 'Email or password is incorrect',
      validEmailMessage: 'Please enter a valid email',
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

  .page {
    display: flex;
    justify-content: center;
    min-height: 100vh;
    padding-top: 48px;
    overflow: auto;
  }

  .sign-in-card {
    width: 300px;
    margin: 0 auto;
  }

  .k-logo-container {
    display: flex;
    justify-content: center;
  }

  .page-title {
    padding: 8px 0;
    font-size: 24px;
    font-weight: bold;
    text-align: center;
  }

  .card-body {
    padding: 0 16px;
  }

  .form {
    padding: 16px 0;
  }

  .create-account-link {
    margin-top: 8px;
  }

  .divider {
    border: 0;
    border-top: 1px solid;
  }

  .guest-link {
    margin-top: 24px;
    text-align: center;
  }

  .w-100 {
    width: 100%;
  }

  .language-switcher {
    margin-top: 16px;
    text-align: center;
  }

  .links {
    margin-top: 16px;
    text-align: center;

    span {
      &:not(:last-child)::after {
        margin: 0 8px 0 12px;
        font-size: 14pt;
        vertical-align: middle;
        content: '•';
      }
    }
  }

</style>
