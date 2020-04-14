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
      <EmailField v-model="email" autofocus />
      <VBtn color="primary" large type="submit" block>
        {{ $tr('submitButton') }}
      </VBtn>
    </VForm>
  </MessageLayout>

</template>


<script>

  import { mapActions } from 'vuex';
  import MessageLayout from '../../components/MessageLayout';
  import EmailField from 'shared/views/form/EmailField';

  export default {
    name: 'RequestNewActivationLink',
    components: {
      MessageLayout,
      EmailField,
    },
    data() {
      return {
        email: '',
      };
    },
    methods: {
      ...mapActions('account', ['sendActivationLink']),
      requestActivationLink() {
        if (this.$refs.form.validate()) {
          this.sendActivationLink(this.email).then(() => {
            this.$router.replace({ name: 'ActivationLinkReSent' });
          });
        }
      },
    },
    $trs: {
      activationExpiredTitle: 'Activation failed',
      activationExpiredText: 'This activation link has been used already or is invalid.',
      submitButton: 'Submit',
    },
  };

</script>


<style lang="less" scoped>

  .form-section {
    font-size: 14px;
  }

</style>
