<template>

  <div>
    <!-- Navigation -->
    <ToolBar v-if="true" color="white">
      <VToolbarSideIcon @click="drawer = true" />
    </ToolBar>
    <MainNavigationDrawer v-model="drawer" />

    <!-- Full Page Errors -->
    <VContent class="pa-0">
      <ChannelNotFoundError
        v-if="showNotFoundError"
        :backHomeLink="myChannelsUrl"
      />

      <PermissionsError
        v-else-if="showNotViewableError"
        :details="$tr('permissionDeniedDetails')"
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
  import GenericError from 'shared/views/errors/GenericError';
  import PermissionsError from 'shared/views/errors/PermissionsError';

  // NOTE: 404 Error Page for the topic level is contained inside of TreeViewBase
  export default {
    name: 'ChannelEditAppError',
    components: {
      ChannelNotFoundError,
      GenericError,
      MainNavigationDrawer,
      PermissionsError,
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
      showNotViewableError() {
        return this.error.errorType === ChannelEditPageErrors.CHANNEL_NOT_VIEWABLE;
      },
      showNotFoundError() {
        return this.error.errorType === ChannelEditPageErrors.CHANNEL_NOT_FOUND;
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
    $trs: {
      permissionDeniedDetails:
        'Sign in or ask the owner of this channel to give you permission to edit or view',
    },
  };

</script>


<style lang="less" scoped></style>
