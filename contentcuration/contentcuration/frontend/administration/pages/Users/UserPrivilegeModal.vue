<template>

  <MessageDialog
    v-model="dialog"
    :header="header"
    :text="text"
  >
    <VForm
      ref="form"
      lazy-validation
      @submit.prevent="confirm"
    >
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
      <VBtn
        flat
        data-test="cancel"
        @click="close"
      >
        Cancel
      </VBtn>
      <VBtn
        color="primary"
        @click="confirm"
      >
        {{ confirmText }}
      </VBtn>
    </template>
  </MessageDialog>

</template>


<script>

  import { mapState } from 'vuex';
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
      header: {
        type: String,
        required: true,
      },
      text: {
        type: String,
        required: true,
      },
      confirmText: {
        type: String,
        default: 'Confirm',
      },
      confirmAction: {
        type: Function,
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
      dialog: {
        get() {
          return this.value;
        },
        set(value) {
          this.$emit('input', value);
        },
      },
      emailRules() {
        return [
          v => Boolean(v) || 'Field is required',
          v => v === this.currentEmail || 'Email does not match your account email',
        ];
      },
    },
    methods: {
      close() {
        this.emailConfirm = '';
        this.resetValidation();
        this.dialog = false;
      },
      resetValidation() {
        this.$refs.form.resetValidation();
      },
      confirm() {
        if (this.$refs.form.validate()) {
          return this.confirmAction();
        } else {
          return Promise.resolve();
        }
      },
    },
  };

</script>
