<template>

  <KModal
    v-if="dialog"
    :title="title"
    :text="text"
    :submitText="confirmText"
    :cancelText="$tr('cancelAction')"
    data-test="user-privilege-modal"
    @submit="submit"
    @cancel="close"
  >
    <form
      ref="form"
      @submit.prevent="confirm"
    >
      <p>{{ $tr('confirmEmailPrompt') }}</p>

      <KTextbox
        v-model="emailConfirm"
        box
        :maxlength="100"
        counter
        :label="$tr('emailLabel')"
        :invalid="errors.emailConfirm"
        :invalidText="$tr('emailValidationMessage')"
        :showInvalidText="true"
        data-test="email-input"
      />
    </form>

    <template #actions>
      <KButton
        flat
        data-test="cancel"
        type="button"
        @click="close"
      >
        {{ $tr('cancelAction') }}
      </KButton>

      <KButton
        data-test="confirm"
        primary
        type="button"
        @click="submit"
      >
        {{ confirmText }}
      </KButton>
    </template>
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
        currentEmail: (state) => state.session.currentUser.email,
      }),
      dialog: {
        get() {
          return this.value;
        },
        set(v) {
          this.$emit('input', v);
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
        if (typeof this.reset === 'function') {
          this.reset();
        } else {
          this.emailConfirm = '';
          if (this.errors) {
            Object.keys(this.errors).forEach(k => (this.errors[k] = false));
          }
        }
        this.$emit('input', false);
      },

      // eslint-disable-next-line vue/no-unused-properties
      confirm() {
        if (typeof this.submit === 'function') {
          return this.submit();
        }
        return Promise.resolve();
      },
      // eslint-disable-next-line vue/no-unused-properties
      onSubmit(formData) {
        try {
          const res = this.confirmAction(formData);
          if (res && typeof res.then === 'function') {
            return res.then((val) => {
              this.dialog = false;
              return val;
            });
          }
          this.dialog = false;
          return Promise.resolve(res);
        } catch (err) {
          return Promise.reject(err);
        }
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
