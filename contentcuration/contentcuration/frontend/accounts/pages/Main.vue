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
        <VForm ref="form" lazy-validation class="py-4">
          <EmailField v-model="email" />
          <VTextField
            v-model="password"
            outline
            required
            type="password"
            :rules="passwordRules"
            :label="$tr('passwordLabel')"
          />
          <p>
            <ActionLink :to="{name: 'ForgotPassword' }" :text="$tr('forgotPasswordLink')" />
          </p>
          <VBtn block color="primary" large @click="submit">
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

  import EmailField from '../components/EmailField';
  import ActionLink from 'shared/views/ActionLink';

  export default {
    name: 'Main',
    components: {
      ActionLink,
      EmailField,
    },
    data() {
      return {
        email: '',
        password: '',
      };
    },
    computed: {
      passwordRules() {
        return [v => !!v || this.$tr('passwordRequiredMessage')];
      },
    },
    methods: {
      submit() {
        if (this.$refs.form.validate()) {
          // sign in
        }
      },
    },
    $trs: {
      kolibriStudio: 'Kolibri Studio',
      passwordLabel: 'Password',
      passwordRequiredMessage: 'Password is required',
      forgotPasswordLink: 'Forgot your password?',
      signInButton: 'Sign in',
      createAccountButton: 'Create an account',
      guestModeLink: 'Explore without an account',
    },
  };

</script>


<style lang="less" scoped>

  .wrapper {
    min-height: 100vh;
  }

</style>
