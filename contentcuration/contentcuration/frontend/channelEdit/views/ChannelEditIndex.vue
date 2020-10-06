<template>

  <VApp>
    <ChannelEditAppError v-if="fullPageError" :error="fullPageError" />
    <router-view v-else />
    <PolicyUpdates />
    <GlobalSnackbar />
  </VApp>

</template>

<script>

  import ChannelEditAppError from './ChannelEditAppError';
  import PolicyUpdates from 'shared/views/policies/PolicyUpdates';
  import GlobalSnackbar from 'shared/views/GlobalSnackbar';

  export default {
    name: 'ChannelEditIndex',
    components: {
      ChannelEditAppError,
      PolicyUpdates,
      GlobalSnackbar,
    },
    computed: {
      fullPageError() {
        // Read errors bootstrapped into window.CHANNEL_EDIT_GLOBAL
        const { channel_error } = window.CHANNEL_EDIT_GLOBAL;
        if (channel_error) {
          return {
            errorType: channel_error,
          };
        } else {
          return this.$store.state.errors.fullPageError;
        }
      },
    },
  };

</script>
