<template>

  <VApp>
    <ChannelEditAppError v-if="fullPageError" :error="fullPageError" />
    <router-view v-else />
  </VApp>

</template>

<script>

  import ChannelEditAppError from './ChannelEditAppError';

  export default {
    name: 'ChannelEditIndex',
    components: {
      ChannelEditAppError,
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
