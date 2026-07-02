<template>
  <StudioMessageLayout
    :header="$tr('activationExpiredTitle')"
    :text="$tr('activationExpiredText')"
  >
    <form
      novalidate
      @submit.prevent="requestActivationLink"
    >
      <StudioBanner
        v-if="error"
        error
        class="banner"
      >
        {{ $tr('activationRequestFailed') }}
      </StudioBanner>
      <StudioEmailField
        v-model="email"
        autofocus
        :label="$tr('emailLabel')"
        :errorMessages="errors.email ? [emailErrorText] : []"
      />
      <KButton
        primary
        class="w-100"
        :text="$tr('submitButton')"
        type="submit"
      />
    </form>
  </StudioMessageLayout>
</template>


<script>
  import { mapActions } from 'vuex';
  import StudioMessageLayout from '../../components/StudioMessageLayout';
  import StudioEmailField from '../../components/form/StudioEmailField';
  import StudioBanner from 'shared/views/StudioBanner';
  import { generateFormMixin } from 'shared/mixins';

  const formMixin = generateFormMixin({
    email: {
      required: true,
      validator: v => Boolean(v && v.trim()) && /\S+@\S+\.\S+/.test(v),
    },
  });

  export default {
    name: 'RequestNewActivationLink',
    components: {
      StudioMessageLayout,
      StudioEmailField,
      StudioBanner,
    },
    mixins: [formMixin],
    data() {
      return {
        error: false,
      };
    },
    computed: {
      emailErrorText() {
        if (!this.email || !this.email.trim()) {
          return this.$tr('fieldRequiredMessage');
        }
        return this.$tr('emailValidationMessage');
      },
    },
    methods: {
      ...mapActions('account', ['sendActivationLink']),
      requestActivationLink() {
        this.error = false;
        const formData = this.clean();
        if (this.validate(formData)) {
          this.sendActivationLink(formData.email)
            .then(() => {
              this.$router.replace({ name: 'ActivationLinkReSent' }).catch(() => {});
            })
            .catch(() => {
              this.error = true;
            });
        }
      },
    },
    $trs: {
      activationExpiredTitle: 'Activation failed',
      activationExpiredText: 'This activation link has been used already or has expired.',
      submitButton: 'Submit',
      activationRequestFailed: 'Failed to send a new activation link. Please try again.',
      emailLabel: 'Email',
      fieldRequiredMessage: 'This field is required',
      emailValidationMessage: 'Please enter a valid email',
    },
  };
</script>


<style lang="scss" scoped>
  form {
    width: 400px;
    max-width: 100%;
    text-align: left;
  }

  .banner {
    width: 100%;
    margin-bottom: 16px;
  }

  .w-100 {
    width: 100%;
  }
</style>
