<template>

  <KModal
    v-if="dialog"
    :title="title"
    :submitText="confirmText"
    :cancelText="$tr('cancelAction')"
    @submit="submit"
    @cancel="close"
  >
    <p>{{ text }}</p>

    <p>{{ $tr('confirmEmailPrompt') }}</p>

    <KTextbox
      v-model="emailConfirm"
      :maxlength="100"
      :label="$tr('emailLabel')"
      :invalid="errors.emailConfirm"
      :invalidText="$tr('emailValidationMessage')"
      :showInvalidText="true"
    />
  </KModal>

</template>


<script>

  import { mapState } from 'vuex';
  import { generateFormMixin } from 'shared/mixins';

  const formMixin = generateFormMixin({
    emailConfirm: {
      required: true,
      validator: (value, vm) => {
        return value === vm.currentEmail;
      },
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
    computed: {
      ...mapState({
        // eslint-disable-next-line kolibri/vue-no-unused-vuex-properties, vue/no-unused-properties
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
    },
    watch: {
      value(val) {
        if (val) {
          this.reset();
        }
      },
    },
    methods: {
      close() {
        this.$emit('input', false);
      },

      // This is called from formMixin
      // eslint-disable-next-line kolibri/vue-no-unused-methods, vue/no-unused-properties
      onSubmit() {
        return Promise.resolve(this.confirmAction()).then(result => {
          this.dialog = false;
          return result;
        });
      },
    },

    $trs: {
      emailLabel: 'Email address',
      emailValidationMessage: 'Email must match your account email',
      cancelAction: 'Cancel',
      confirmEmailPrompt: 'Enter your email address to continue',
    },
  };

</script>
