<template>

  <VApp>
    <ChannelEditAppError
      v-if="fullPageError"
      :error="fullPageError"
    />
    <router-view v-else />
    <PolicyModals />
    <GlobalSnackbar />
  </VApp>

</template>


<script>

  import { mapActions } from 'vuex';
  import ChannelEditAppError from './ChannelEditAppError';
  import PolicyModals from 'shared/views/policies/PolicyModals';
  import GlobalSnackbar from 'shared/views/GlobalSnackbar';

  export default {
    name: 'ChannelEditIndex',
    components: {
      ChannelEditAppError,
      PolicyModals,
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
    created() {
      this.initState();
    },
    methods: {
      ...mapActions('task', ['initState']),
    },
  };

</script>
