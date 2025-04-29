<template>

  <div>
    <!-- Navigation -->
    <ToolBar
      v-if="true"
      color="white"
    >
      <VToolbarSideIcon @click="drawer = true" />
    </ToolBar>
    <MainNavigationDrawer v-model="drawer" />

    <!-- Full Page Errors -->
    <VContent class="pa-0">
      <ChannelNotFoundError
        v-if="showNotFoundError"
        :backHomeLink="myChannelsUrl"
      />

      <ChannelDeletedError
        v-else-if="showDeletedError"
        :backHomeLink="myChannelsUrl"
      />

      <GenericError
        v-else
        :error="error"
        :backHomeLink="myChannelsUrl"
      />
    </VContent>
  </div>

</template>


<script>

  import { ChannelEditPageErrors } from '../constants';
  import MainNavigationDrawer from 'shared/views/MainNavigationDrawer';
  import ToolBar from 'shared/views/ToolBar';
  import ChannelNotFoundError from 'shared/views/errors/ChannelNotFoundError';
  import ChannelDeletedError from 'shared/views/errors/ChannelDeletedError';
  import GenericError from 'shared/views/errors/GenericError';

  // NOTE: 404 Error Page for the topic level is contained inside of TreeViewBase
  export default {
    name: 'ChannelEditAppError',
    components: {
      ChannelNotFoundError,
      ChannelDeletedError,
      GenericError,
      MainNavigationDrawer,
      ToolBar,
    },
    props: {
      error: {
        type: Object,
        required: true,
      },
    },
    data() {
      return {
        drawer: false,
      };
    },
    computed: {
      showNotFoundError() {
        return this.error.errorType === ChannelEditPageErrors.CHANNEL_NOT_FOUND;
      },
      showDeletedError() {
        return this.error.errorType === ChannelEditPageErrors.CHANNEL_DELETED;
      },
      // All links exit to "My Channels" tab on ChannelList page
      myChannelsUrl() {
        return {
          href: window.Urls.channels(),
        };
      },
    },
    watch: {
      $route() {
        this.$store.dispatch('errors/resetState');
      },
    },
  };

</script>


<style lang="scss" scoped></style>
