<template>

  <KModal title="Change password">
    <form @submit.prevent="submitPassword">

      <PasswordField v-model="password" :label="$tr('newPasswordLabel')" :invalid="formIsInvalid" />

      <PasswordField 
        v-model="confirmation" 
        :label="$tr('confirmNewPasswordLabel')" 
        :invalid="formIsInvalid" 
        :invalidText="$tr('formInvalidText')" 
      />

      <div slot="actions" style="text-align: right;">
        <KButtonGroup>
          <KButton
            :text="$tr('cancelAction')"
            @click="$emit('hidePasswordForm')"
          />
          <KButton
            :text="$tr('saveChangesAction')"
            type="submit"
            primary
          />
        </KButtonGroup>
      </div>

    </form>
  </KModal>

</template>

<script>

  import { mapActions } from 'vuex';
  import PasswordField from 'shared/views/form/PasswordField';

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
      ...mapActions(['showSnackbar', 'updateUserPassword']),
      submitPassword() {
        if (this.password === this.confirmation) {
          const email = this.$store.state.session.currentUser.email;
          
          this.updateUserPassword({ email, password: this.password })
            .then(() => {
              this.$emit('hidePasswordForm');
              this.showSnackbar({ text: 'Password updated' });
            })
            .catch(e => {
              window.alert(`Failed to save new password: ${e}`);
            });
        } else {
          this.formIsInvalid = true;
        }
      },
    },
    $trs: {
      newPasswordLabel: 'New password',
      confirmNewPasswordLabel: 'Confirm new password',
      formInvalidText: 'Password and confirmation must match',
      cancelAction: 'Cancel',
      saveChangesAction: 'Save changes',
    },
  };

</script>

<style>

</style>
