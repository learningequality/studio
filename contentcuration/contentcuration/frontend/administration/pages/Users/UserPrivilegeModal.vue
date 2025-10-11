<template>

  <KModal
    v-if="dialog"
    :title="title"
    :text="text"
    :submitText="confirmText"
    cancelText="Cancel"
    @submit="confirm"
    @cancel="close"
  >
    <form
      ref="form"
      lazy-validation
      @submit.prevent="confirm"
    >
      <p>Enter your email address to continue</p>
      <KTextbox
        v-model="emailConfirm"
        box
        :maxlength="100"
        counter
        required
        :invalid="errors.emailConfirm"
        :invalidText="$tr('emailValidationMessage')"
        :showInvalidText="true"
        :label="$tr('emailLabel')"
      />
    </form>
  </KModal>

</template>


<script>

  import { generateFormMixin } from 'shared/mixins';

  const formMixin = generateFormMixin({
    emailConfirm: {
      required: true,
      validator: (value, vm) => value === vm.currentEmail,
    },
  });

  export default {
    name: 'UserPrivilegeModal',
    mixins: [formMixin],
    props: {
      value: {
        type: Boolean,
        default: false,
      },
      title: {
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
        if (value) {
          this.reset();
        }
      },
    },
    methods: {
      close() {
        this.emailConfirm = '';
        // Clear errors manually if using generateFormMixin
        if (this.errors) {
          Object.keys(this.errors).forEach(key => {
            this.errors[key] = false;
          });
        }
        this.dialog = false;
      },
      confirm() {
        if (this.onSubmit) {
          return this.onSubmit();
        } else {
          return Promise.resolve();
        }
      },
      // eslint-disable-next-line vue/no-unused-properties
      onSubmit() {
        return this.confirmAction()
          .then(() => {
            this.dialog = false;
          })
          .catch(() => {
            this.showSnackbar({ text: this.$tr('ErrorMessage') });
          });
      },
    },
    $trs: {
      emailLabel: 'Email address',
      emailValidationMessage: 'Email must match your account email',
      ErrorMessage: 'Error While updating privileges',
    },
  };

</script>
