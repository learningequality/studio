<template>

  <div>
    <KModal
      v-if="dialog"
      :title="$tr('deleteAccountLabel')"
      :submitText="$tr('deleteAccountLabel')"
      :cancelText="$tr('cancelButton')"
      @submit="deleteUserAccount"
      @cancel="dialog = false"
    >
      <p>{{ $tr('deleteAccountConfirmationPrompt') }}</p>
      <p>{{ $tr('deleteAccountEnterEmail') }}</p>
      <KTextbox
        v-model="accountDeletionEmail"
        :label="$tr('emailAddressLabel')"
        :invalid="Boolean(deletionEmailInvalidMessage)"
        :invalidText="deletionEmailInvalidMessage"
        :showInvalidText="Boolean(deletionEmailInvalidMessage)"
        @input="deletionEmailInvalidMessage = ''"
      />
    </KModal>
    <Alert
      v-model="deletionFailed"
      :header="$tr('deletionFailed')"
      :text="$tr('deletionFailedText')"
    />
  </div>

</template>


<script>

  import { mapActions, mapState } from 'vuex';
  import Alert from 'shared/views/Alert';

  export default {
    name: 'DeleteAccountForm',
    components: {
      Alert,
    },
    props: {
      value: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        accountDeletionEmail: '',
        deletionFailed: false,
        deletionEmailInvalidMessage: '',
      };
    },
    computed: {
      ...mapState({
        user: state => state.session.currentUser,
      }),
      dialog: {
        get() {
          return this.value;
        },
        set(value) {
          this.$emit('input', value);
          this.accountDeletionEmail = '';
        },
      },
    },
    methods: {
      ...mapActions('settings', ['deleteAccount']),
      deleteUserAccount() {
        if (!this.accountDeletionEmail.trim()) {
          this.deletionEmailInvalidMessage = this.$tr('fieldRequired');
        } else if (this.user.email !== this.accountDeletionEmail) {
          this.deletionEmailInvalidMessage = this.$tr('emailInvalidText');
        } else {
          return this.deleteAccount(this.user.email)
            .then(() => {
              window.location = `${window.Urls.accounts()}#/account-deleted`;
            })
            .catch(() => {
              this.deletionFailed = true;
            });
        }
        return Promise.resolve();
      },
    },
    $trs: {
      deleteAccountLabel: 'Delete account',
      deleteAccountConfirmationPrompt:
        'Are you sure you want to permanently delete your account? This cannot be undone',
      deleteAccountEnterEmail: 'Enter your email address to continue',
      cancelButton: 'Cancel',
      emailAddressLabel: 'Email address',
      emailInvalidText: 'Email does not match your account email',
      fieldRequired: 'Field is required',
      deletionFailed: 'Failed to delete account',
      deletionFailedText:
        'Failed to delete your account. Please contact us here: https://community.learningequality.org.',
    },
  };

</script>
