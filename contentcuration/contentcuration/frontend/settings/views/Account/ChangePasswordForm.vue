<template>

  <KModal title="Change password">
    <form @submit.prevent="submitPassword">
      <PasswordField v-model="password" label="New password" :invalid="formIsInvalid" />
      <PasswordField v-model="confirmation" label="Confirm new password" :invalid="formIsInvalid" invalidText="Password and confirmation must match" />

      <div slot="actions" style="text-align: right;">
        <KButtonGroup>
          <KButton
            text="Cancel"
            @click="$emit('hidePasswordForm')"
          />
          <KButton
            text="Save changes"
            type="submit"
            primary
          />
        </KButtonGroup>
      </div>
    </form>
  </KModal>

</template>

<script>

  import client from '../../../shared/client';
  import PasswordField from '../../../shared/views/form/PasswordField';

  export default {
    name: 'ChangePasswordForm',
    components: { PasswordField },
    data() {
      return {
        password: '',
        confirmation: '',
        formIsInvalid: false,
      };
    },
    methods: {
      submitPassword() {
        if(this.password === this.confirmation) {
          const email = this.$store.state.session.currentUser.email;
          client.patch(window.Urls.change_password(email), { password: this.password })
            .then(() => {
                this.$emit("hidePasswordForm");
                this.$store.dispatch("showSnackbar", { text: "Password updated" });
            })
            .catch(e => window.alert(`Failed to save new password: ${e}`));
        } else {
          this.formIsInvalid = true;
        }
      }
    }
  }

</script>

<style>

</style>
