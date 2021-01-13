<template>

  <MessageDialog
    v-model="dialog"
    header="Remove admin privileges"
    :text="`Are you sure you want to remove admin privileges from user '${user.name}'?`"
  >
    <VForm ref="form" lazy-validation @submit.prevent="revokeAdminPrivilege">
      <p>Enter your email address to continue</p>
      <VTextField
        v-model="emailConfirm"
        box
        maxlength="100"
        counter
        required
        :rules="emailRules"
        label="Email address"
        @input="resetValidation"
      />
    </VForm>
    <template #buttons>
      <VBtn flat data-test="cancel" @click="close">
        Cancel
      </VBtn>
      <VBtn color="primary" @click="revokeAdminPrivilege">
        Remove privileges
      </VBtn>
    </template>
  </MessageDialog>

</template>


<script>

  import { mapActions, mapGetters, mapState } from 'vuex';
  import MessageDialog from 'shared/views/MessageDialog';

  export default {
    name: 'UserPrivilegeModal',
    components: {
      MessageDialog,
    },
    props: {
      value: {
        type: Boolean,
        default: false,
      },
      userId: {
        type: String,
        required: true,
      },
    },
    data() {
      return {
        emailConfirm: '',
      };
    },
    computed: {
      ...mapState({
        currentEmail: state => state.session.currentUser.email,
      }),
      ...mapGetters('userAdmin', ['getUser']),
      dialog: {
        get() {
          return this.value;
        },
        set(value) {
          this.$emit('input', value);
        },
      },
      user() {
        return this.getUser(this.userId);
      },
      emailRules() {
        return [
          v => Boolean(v) || 'Field is required',
          v => v === this.currentEmail || 'Email does not match your account email',
        ];
      },
    },
    methods: {
      ...mapActions('userAdmin', ['updateUser']),
      close() {
        this.emailConfirm = '';
        this.resetValidation();
        this.dialog = false;
      },
      resetValidation() {
        this.$refs.form.resetValidation();
      },
      revokeAdminPrivilege() {
        if (this.$refs.form.validate()) {
          return this.updateUser({ id: this.userId, is_admin: false });
        } else {
          return Promise.resolve();
        }
      },
    },
  };

</script>
