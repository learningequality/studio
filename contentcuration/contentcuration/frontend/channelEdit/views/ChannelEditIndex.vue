<template>

  <VApp>
    <ToolBar v-if="currentChannel" color="white">
      <VToolbarSideIcon @click="drawer = true" />
      <VToolbarTitle class="notranslate">
        {{ currentChannel.name }}
      </VToolbarTitle>
      <VToolbarItems v-if="$vuetify.breakpoint.smAndUp" class="ml-4">
        <IconButton icon="info" :text="$tr('channelDetails')" :to="viewChannelDetailsLink" />
        <IconButton v-if="canEdit" icon="edit" :text="$tr('editChannel')" :to="editChannelLink" />
        <IconButton v-if="canEdit" icon="delete" :text="$tr('openTrash')" :to="trashLink" />
      </VToolbarItems>
      <VSpacer />
      <template v-if="$vuetify.breakpoint.smAndUp">
        <VTooltip v-if="canEdit" bottom attach="body">
          <template #activator="{ on }">
            <!-- Need to wrap in div to enable tooltip when button is disabled -->
            <div style="height: 100%;" v-on="on">
              <VBtn
                color="primary"
                flat
                class="ma-0"
                :class="{disabled: !isChanged}"
                :disabled="!isChanged"
                style="height: inherit;"
                @click.stop="showPublishModal = true"
              >
                {{ $tr('publishButton') }}
              </VBtn>
            </div>
          </template>
          <span>{{ isChanged? $tr('publishButtonTitle') : $tr('noChangesText') }}</span>
        </VTooltip>
        <span v-else class="subheading font-weight-bold grey--text">
          {{ $tr('viewOnly') }}
        </span>
      </template>
      <VToolbarItems>
        <VMenu v-if="showChannelMenu" offset-y>
          <template #activator="{ on }">
            <VBtn flat icon v-on="on">
              <Icon>more_horiz</Icon>
            </VBtn>
          </template>
          <VList>
            <template v-if="$vuetify.breakpoint.xsOnly">
              <VListTile v-if="canEdit" @click="showPublishModal = true">
                <VListTileTitle>{{ $tr('publishButton') }}</VListTileTitle>
              </VListTile>
              <VListTile :to="viewChannelDetailsLink">
                <VListTileTitle>{{ $tr('channelDetails') }}</VListTileTitle>
              </VListTile>
              <VListTile v-if="canEdit" :to="editChannelLink">
                <VListTileTitle>{{ $tr('editChannel') }}</VListTileTitle>
              </VListTile>
              <VListTile v-if="canEdit" @click.stop>
                <VListTileTitle>{{ $tr('openTrash') }}</VListTileTitle>
              </VListTile>
            </template>
            <VListTile v-if="isPublished" @click="showTokenModal = true;">
              <VListTileTitle>{{ $tr('getToken') }}</VListTileTitle>
            </VListTile>
            <VListTile v-if="canEdit" :to="shareChannelLink">
              <VListTileTitle>{{ $tr('shareChannel') }}</VListTileTitle>
            </VListTile>
            <VListTile v-if="canEdit" @click="showSyncModal = true;">
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
    <PublishModal v-if="showPublishModal" v-model="showPublishModal" />
    <ProgressModal />
    <MoveModal v-if="moveNodes.length" />
    <template v-if="isPublished">
      <ChannelTokenModal v-model="showTokenModal" :channel="currentChannel" />
    </template>
    <SyncResourcesModal v-if="currentChannel" v-model="showSyncModal" :channel="currentChannel" />
    <VSpeedDial
      v-model="showClipboard"
      bottom
      right
      direction="top"
      transition="slide-y-reverse-transition"
    >
      <template #activator>
        <VBtn v-model="showClipboard" fab>
          <Icon>content_paste</Icon>
        </VBtn>
      </template>
    </VSpeedDial>
    <Clipboard
      :open="showClipboard"
      @close="showClipboard = false"
    />
  </VApp>

</template>


<script>

  import { mapGetters, mapState } from 'vuex';
  import { RouterNames } from '../constants';
  import MoveModal from '../move/MoveModal';
  import Clipboard from '../components/Clipboard';
  import ChannelNavigationDrawer from './ChannelNavigationDrawer';
  import PublishModal from './publish/PublishModal';
  import ProgressModal from './progress/ProgressModal';
  import SyncResourcesModal from './sync/SyncResourcesModal';
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
      PublishModal,
      ProgressModal,
      ChannelTokenModal,
      MoveModal,
      SyncResourcesModal,
      Clipboard,
    },
    data() {
      return {
        drawer: false,
        showPublishModal: false,
        showTokenModal: false,
        showSyncModal: false,
        showClipboard: false,
      };
    },
    computed: {
      ...mapState('contentNode', ['moveNodes']),
      ...mapGetters('currentChannel', ['currentChannel', 'canEdit']),
      isChanged() {
        return true;
      },
      isPublished() {
        return this.currentChannel && this.currentChannel.published;
      },
      showChannelMenu() {
        return this.$vuetify.breakpoint.xsOnly || this.canEdit || this.isPublished;
      },
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
      trashLink() {
        return {
          name: RouterNames.TRASH,
        };
      },
      shareChannelLink() {
        return {
          name: ChannelRouterNames.CHANNEL_EDIT,
          params: {
            channelId: this.currentChannel.id,
          },
          query: {
            sharing: true,
          },
        };
      },
    },
    $trs: {
      channelDetails: 'View channel details',
      editChannel: 'Edit channel details',
      openTrash: 'Open trash',
      getToken: 'Get token',
      shareChannel: 'Share channel',
      syncChannel: 'Sync channel',
      publishButton: 'Publish',
      publishButtonTitle: 'Make this channel available for download into Kolibri',
      viewOnly: 'View-only',
      noChangesText: 'No changes found in channel',
    },
  };

</script>


<style lang="less" scoped>

  .v-speed-dial {
    position: absolute;

    .v-btn--floating {
      position: relative;
    }
  }

</style>
