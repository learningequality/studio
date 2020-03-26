<template>

  <VApp>
    <VLayout
      fill-height
      align-center
      justify-center
      :style="{backgroundColor: $vuetify.theme.primary}"
    >
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
        <VAlert type="error" outline icon="error" class="mt-4" :value="loginFailed">
          {{ $tr('loginFailed') }}
        </VAlert>
        <VForm ref="form" lazy-validation class="py-4" @submit.prevent="submit">
          <EmailField v-model="credentials.username" autofocus />
          <PasswordField v-model="credentials.password" :label="$tr('passwordLabel')" />
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
    </VLayout>
  </VApp>

</template>


<script>

  import { mapActions } from 'vuex';
  import EmailField from '../components/EmailField';
  import PasswordField from '../components/PasswordField';
  import ActionLink from 'shared/views/ActionLink';

  export default {
    name: 'Main',
    components: {
      ActionLink,
      EmailField,
      PasswordField,
    },
    data() {
      return {
        credentials: {
          username: '',
          password: '',
        },
        loginFailed: false,
      };
    },
    methods: {
      ...mapActions(['login']),
      submit() {
        if (this.$refs.form.validate()) {
          this.login(this.credentials)
            .then(() => {
              let params = new URLSearchParams(window.location.href.split('?')[1]);
              window.location = '/' + (params.get('next') || 'channels');
            })
            .catch(err => {
              if (err.response.status === 405) {
                this.$router.push({ name: 'AccountNotActivated' });
              }
              this.loginFailed = true;
            });
        }
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
    },
  };

</script>


<style lang="less" scoped>

  .wrapper {
    min-height: 100vh;
  }

</style>
