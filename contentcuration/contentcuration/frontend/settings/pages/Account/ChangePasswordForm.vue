<template>

  <KModal
    v-if="dialog"
    :title="$tr('changePasswordHeader')"
    :submitText="$tr('saveChangesAction')"
    :cancelText="$tr('cancelAction')"
    @submit="submitPassword"
    @cancel="dialog = false"
  >
    <!-- inline style here avoids scrollbar on validations -->
    <VForm
      ref="form"
      style="height: 196px"
    >
      <PasswordField
        v-model="password"
        :additionalRules="passwordValidationRules"
        :label="$tr('newPasswordLabel')"
      />
      <PasswordField
        v-model="confirmation"
        :label="$tr('confirmNewPasswordLabel')"
        :additionalRules="passwordConfirmRules"
      />
    </VForm>
  </KModal>

</template>


<script>

  import { mapActions } from 'vuex';
  import PasswordField from 'shared/views/form/PasswordField';

  export default {
    name: 'ChangePasswordForm',
    components: { PasswordField },
    props: {
      value: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        password: '',
        confirmation: '',
      };
    },
    computed: {
      dialog: {
        get() {
          return this.value;
        },
        set(value) {
          this.$emit('input', value);
        },
      },
      passwordValidationRules() {
        return [value => (value.length >= 8 ? true : this.$tr('passwordValidationMessage'))];
      },
      passwordConfirmRules() {
        return [value => (this.password === value ? true : this.$tr('formInvalidText'))];
      },
    },
    watch: {
      value(value) {
        // Reset values on open
        if (value) {
          this.password = '';
          this.confirmation = '';
        }
      },
    },
    methods: {
      ...mapActions(['showSnackbar']),
      ...mapActions('settings', ['updateUserPassword']),
      submitPassword() {
        if (this.$refs.form.validate()) {
          return this.updateUserPassword(this.password)
            .then(() => {
              this.dialog = false;
              this.showSnackbar({ text: this.$tr('paswordChangeSuccess') });
            })
            .catch(() => {
              this.showSnackbar({ text: this.$tr('passwordChangeFailed') });
            });
        }
      },
    },
    $trs: {
      changePasswordHeader: 'Change password',
      newPasswordLabel: 'New password',
      confirmNewPasswordLabel: 'Confirm new password',
      formInvalidText: "Passwords don't match",
      passwordValidationMessage: 'Password should be at least 8 characters long',
      cancelAction: 'Cancel',
      saveChangesAction: 'Save changes',
      paswordChangeSuccess: 'Password updated',
      passwordChangeFailed: 'Failed to save new password',
    },
  };

</script>


<style></style>
