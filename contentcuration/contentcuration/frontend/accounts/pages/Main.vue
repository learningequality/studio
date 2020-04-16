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
        <Banner :value="loginFailed" :text="$tr('loginFailed')" error />
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
    </VLayout>
  </VApp>

</template>


<script>

  import { mapActions } from 'vuex';
  import EmailField from 'shared/views/form/EmailField';
  import PasswordField from 'shared/views/form/PasswordField';
  import Banner from 'shared/views/Banner';

  export default {
    name: 'Main',
    components: {
      EmailField,
      PasswordField,
      Banner,
    },
    data() {
      return {
        username: '',
        password: '',
        loginFailed: false,
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
              window.location = '/' + (params.get('next') || 'channels');
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
    },
  };

</script>


<style lang="less" scoped>

  .wrapper {
    min-height: 100vh;
  }

</style>
