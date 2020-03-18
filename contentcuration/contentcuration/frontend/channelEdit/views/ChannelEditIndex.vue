<template>

  <VApp>
    <ToolBar v-if="currentChannel" color="white">
      <VToolbarSideIcon @click="drawer = true" />
      <VToolbarTitle class="notranslate">
        {{ currentChannel.name }}
      </VToolbarTitle>
      <VToolbarItems class="ml-4">
        <IconButton icon="info" :text="$tr('channelDetails')" :to="viewChannelDetailsLink" />
        <IconButton v-if="canEdit" icon="edit" :text="$tr('editChannel')" :to="editChannelLink" />
        <IconButton v-if="canEdit" icon="delete" :text="$tr('openTrash')" />
      </VToolbarItems>
      <VSpacer />
      <VToolbarItems>
        <VBtn v-if="canEdit" flat color="primary" class="hidden-sm-and-down">
          {{ $tr('publishButton') }}
        </VBtn>
        <VMenu offset-y>
          <template #activator="{ on }">
            <VBtn flat icon v-on="on">
              <Icon>more_horiz</Icon>
            </VBtn>
          </template>
          <VList>
            <VListTile v-if="canEdit" class="hidden-md-and-up" @click.stop>
              <VListTileTitle>{{ $tr('publishButton') }}</VListTileTitle>
            </VListTile>
            <VListTile @click="showTokenModal = true;">
              <VListTileTitle>{{ $tr('getToken') }}</VListTileTitle>

            </VListTile>
            <VListTile v-if="canView || canEdit" @click.stop>
              <VListTileTitle>{{ $tr('shareChannel') }}</VListTileTitle>
            </VListTile>
            <VListTile v-if="canEdit" @click.stop>
              <VListTileTitle>{{ $tr('syncChannel') }}</VListTileTitle>
            </VListTile>
          </VList>
        </VMenu>
      </VToolbarItems>
    </ToolBar>
    <ChannelNavigationDrawer v-model="drawer" />
    <VContent class="pa-0">
      <router-view />
    </VContent>
    <GlobalSnackbar />
    <ProgressModal />
    <template v-if="currentChannel">
      <ChannelTokenModal v-model="showTokenModal" :channel="currentChannel" />
    </template>
  </VApp>

</template>


<script>

  import { mapGetters } from 'vuex';
  import ChannelNavigationDrawer from './ChannelNavigationDrawer';
  import ProgressModal from './progress/ProgressModal';
  import GlobalSnackbar from 'shared/views/GlobalSnackbar';
  import IconButton from 'shared/views/IconButton';
  import ToolBar from 'shared/views/ToolBar';
  import ChannelTokenModal from 'shared/views/channel/ChannelTokenModal';
  import { RouterNames as ChannelRouterNames } from 'frontend/channelList/constants';

  export default {
    name: 'ChannelEditIndex',
    components: {
      GlobalSnackbar,
      IconButton,
      ChannelNavigationDrawer,
      ToolBar,
      ProgressModal,
      ChannelTokenModal,
    },
    data() {
      return {
        drawer: false,
        showTokenModal: false,
      };
    },
    computed: {
      ...mapGetters('currentChannel', ['currentChannel', 'canEdit', 'canView']),
      viewChannelDetailsLink() {
        return {
          name: ChannelRouterNames.CHANNEL_DETAILS,
          params: {
            channelId: this.currentChannel.id,
          },
        };
      },
      editChannelLink() {
        return {
          name: ChannelRouterNames.CHANNEL_EDIT,
          params: {
            channelId: this.currentChannel.id,
          },
        };
      },
    },
    $trs: {
      channelDetails: 'View channel details',
      editChannel: 'Edit channel details',
      openTrash: 'Open trash',
      publishButton: 'Publish',
      getToken: 'Get token',
      shareChannel: 'Share channel',
      syncChannel: 'Sync channel',
    },
  };

</script>


<style lang="less" scoped>

</style>
