<template>

  <KModal
    v-if="dialog"
    :title="$tr('changePasswordHeader')"
    :submitText="$tr('saveChangesAction')"
    :cancelText="$tr('cancelAction')"
    @submit="submit"
    @cancel="dialog = false"
  >
    <form ref="form">
      <KTextbox
        v-model="password"
        type="password"
        :label="$tr('newPasswordLabel')"
        :invalid="errors.password"
        :invalidText="$tr('passwordValidationMessage')"
        :showInvalidText="true"
      />
      <KTextbox
        v-model="confirmation"
        type="password"
        :label="$tr('confirmNewPasswordLabel')"
        :invalid="errors.confirmation"
        :invalidText="$tr('formInvalidText')"
        :showInvalidText="true"
      />
    </form>
  </KModal>

</template>


<script>

  import { mapActions } from 'vuex';
  import { generateFormMixin } from 'shared/mixins';

  const formMixin = generateFormMixin({
    password: {
      required: true,
      // eslint-disable-next-line no-unused-vars
      validator: (value, _vm) => {
        return value.length >= 8;
      },
    },
    confirmation: {
      required: true,
      validator: (value, vm) => {
        return value === vm.password;
      },
    },
  });

  export default {
    name: 'ChangePasswordForm',
    mixins: [formMixin],
    props: {
      value: {
        type: Boolean,
        default: false,
      },
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
    },
    watch: {
      value(value) {
        // Reset values on open
        if (value) {
          this.reset();
        }
      },
    },
    methods: {
      ...mapActions(['showSnackbar']),
      ...mapActions('settings', ['updateUserPassword']),

      // This is called from formMixin
      // eslint-disable-next-line kolibri/vue-no-unused-methods, vue/no-unused-properties
      onSubmit() {
        return this.updateUserPassword(this.password)
          .then(() => {
            this.dialog = false;
            this.showSnackbar({ text: this.$tr('paswordChangeSuccess') });
          })
          .catch(() => {
            this.showSnackbar({ text: this.$tr('passwordChangeFailed') });
          });
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
