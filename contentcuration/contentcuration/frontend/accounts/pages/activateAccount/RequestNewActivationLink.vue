<template>

  <MessageLayout
    :header="$tr('activationExpiredTitle')"
    :text="$tr('activationExpiredText')"
  >
    <VForm
      ref="form"
      lazy-validation
      @submit.prevent="requestActivationLink"
    >
      <Banner
        :text="$tr('activationRequestFailed')"
        :value="error"
        error
        class="mb-4"
      />
      <EmailField
        v-model="email"
        autofocus
      />
      <KButton
        primary
        class="w-100"
        :text="$tr('submitButton')"
        type="submit"
      />
    </VForm>
  </MessageLayout>

</template>


<script>

  import { mapActions } from 'vuex';
  import MessageLayout from '../../components/MessageLayout';
  import EmailField from 'shared/views/form/EmailField';
  import Banner from 'shared/views/Banner';

  export default {
    name: 'RequestNewActivationLink',
    components: {
      MessageLayout,
      EmailField,
      Banner,
    },
    data() {
      return {
        email: '',
        error: false,
      };
    },
    methods: {
      ...mapActions('account', ['sendActivationLink']),
      requestActivationLink() {
        this.error = false;
        if (this.$refs.form.validate()) {
          this.sendActivationLink(this.email)
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
    },
  };

</script>


<style lang="scss" scoped>

  .w-100 {
    width: 100%;
  }

</style>
