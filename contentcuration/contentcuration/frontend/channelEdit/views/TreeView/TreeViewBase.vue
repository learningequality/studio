<template>

  <VContainer fluid class="pa-0">
    <ToolBar
      v-if="currentChannel"
      color="white"
      app
      clipped-left
      clipped-right
      :extension-height="57"
    >
      <VToolbarSideIcon @click="drawer = true" />
      <VToolbarTitle class="notranslate">
        {{ currentChannel.name }}
      </VToolbarTitle>
      <VToolbarItems v-if="$vuetify.breakpoint.smAndUp" class="ml-4">
        <router-link :to="viewChannelDetailsLink">
          <IconButton
            class="toolbar-icon-btn"
            icon="info"
            :text="$tr('channelDetails')"
          />
        </router-link>
        <router-link :to="editChannelLink">
          <VBadge color="transparent">
            <template #badge>
              <Icon v-if="!currentChannel.language" color="red" small class="edit-channel-error">
                error
              </Icon>
            </template>
            <IconButton
              v-if="canEdit"
              class="toolbar-icon-btn"
              icon="edit"
              :text="$tr('editChannel')"
            />
          </VBadge>
        </router-link>
      </VToolbarItems>
      <VSpacer />
      <OfflineText indicator />
      <div v-if="errorsInChannel && canEdit" class="mx-1">
        <VTooltip bottom>
          <template #activator="{ on }">
            <div class="title amber--text" style="width: max-content;" v-on="on">
              {{ $formatNumber(errorsInChannel) }}
              <Icon color="amber">
                warning
              </Icon>
            </div>
          </template>
          <span>{{ $tr('incompleteDescendantsText', {count: errorsInChannel}) }}</span>
        </VTooltip>
      </div>
      <template v-if="$vuetify.breakpoint.smAndUp">
        <span v-if="canManage && isRicecooker" class="subheading font-weight-bold grey--text">
          {{ $tr('apiGenerated') }}
        </span>
        <VTooltip v-if="canManage" bottom attach="body">
          <template #activator="{ on }">
            <!-- Need to wrap in div to enable tooltip when button is disabled -->
            <div style="height: 100%;" v-on="on">
              <VBtn
                color="primary"
                flat
                class="ma-0"
                :class="{disabled: disablePublish}"
                :disabled="disablePublish"
                style="height: inherit;"
                @click.stop="showPublishModal = true"
              >
                {{ $tr('publishButton') }}
              </VBtn>
            </div>
          </template>
          <span>{{ publishButtonTooltip }}</span>
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
              <VListTile
                v-if="canManage"
                :disabled="disablePublish"
                @click="showPublishModal = true"
              >
                <VListTileTitle>{{ $tr('publishButton') }}</VListTileTitle>
              </VListTile>
              <VListTile :to="viewChannelDetailsLink">
                <VListTileTitle>{{ $tr('channelDetails') }}</VListTileTitle>
              </VListTile>
              <VListTile v-if="canEdit" :to="editChannelLink">
                <VListTileTitle>
                  {{ $tr('editChannel') }}
                  <Icon
                    v-if="!currentChannel.language"
                    class="mx-1"
                    small
                    color="red"
                    style="vertical-align: baseline;"
                  >
                    error
                  </Icon>
                </VListTileTitle>
              </VListTile>
            </template>
            <VListTile v-if="isPublished" @click="showTokenModal = true;">
              <VListTileTitle>{{ $tr('getToken') }}</VListTileTitle>
            </VListTile>
            <VListTile v-if="canManage" :to="shareChannelLink">
              <VListTileTitle>{{ $tr('shareChannel') }}</VListTileTitle>
            </VListTile>
            <VListTile v-if="canEdit" @click="showSyncModal = true;">
              <VListTileTitle>{{ $tr('syncChannel') }}</VListTileTitle>
            </VListTile>
            <VListTile v-if="canEdit" :to="trashLink">
              <VListTileTitle>{{ $tr('openTrash') }}</VListTileTitle>
            </VListTile>
          </VList>
        </VMenu>
      </VToolbarItems>
      <template #extension>
        <slot name="extension"></slot>
      </template>
    </ToolBar>
    <MainNavigationDrawer v-model="drawer" />
    <slot></slot>

    <PublishModal v-if="showPublishModal" v-model="showPublishModal" />
    <ProgressModal />
    <MoveModal />
    <template v-if="isPublished">
      <ChannelTokenModal v-model="showTokenModal" :channel="currentChannel" />
    </template>
    <SyncResourcesModal v-if="currentChannel" v-model="showSyncModal" :channel="currentChannel" />
    <VSpeedDial
      v-if="showClipboardSpeedDial"
      v-model="showClipboard"
      bottom
      :right="!$isRTL"
      :left="$isRTL"
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
  </VContainer>

</template>


<script>

  import { mapGetters } from 'vuex';
  import { RouterNames } from '../../constants';
  import MoveModal from '../../components/move/MoveModal';
  import PublishModal from '../../components/publish/PublishModal';
  import ProgressModal from '../progress/ProgressModal';
  import SyncResourcesModal from '../sync/SyncResourcesModal';
  import Clipboard from '../../components/Clipboard';
  import MainNavigationDrawer from 'shared/views/MainNavigationDrawer';
  import IconButton from 'shared/views/IconButton';
  import ToolBar from 'shared/views/ToolBar';
  import ChannelTokenModal from 'shared/views/channel/ChannelTokenModal';
  import OfflineText from 'shared/views/OfflineText';
  import { RouterNames as ChannelRouterNames } from 'frontend/channelList/constants';

  export default {
    name: 'TreeViewBase',
    components: {
      IconButton,
      MainNavigationDrawer,
      ToolBar,
      PublishModal,
      ProgressModal,
      ChannelTokenModal,
      MoveModal,
      SyncResourcesModal,
      Clipboard,
      OfflineText,
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
      ...mapGetters('contentNode', ['getContentNode']),
      ...mapGetters('currentChannel', ['currentChannel', 'canEdit', 'canManage', 'rootId']),
      rootNode() {
        return this.getContentNode(this.rootId);
      },
      errorsInChannel() {
        return this.rootNode && this.rootNode.error_count;
      },
      isChanged() {
        return true;
      },
      isPublished() {
        return this.currentChannel && this.currentChannel.published;
      },
      isRicecooker() {
        return Boolean(this.currentChannel.ricecooker_version);
      },
      disablePublish() {
        return (
          !this.isChanged ||
          !this.currentChannel.language ||
          (this.rootNode && !this.rootNode.total_count)
        );
      },
      publishButtonTooltip() {
        if (this.rootNode && !this.rootNode.total_count) {
          return this.$tr('emptyChannelTooltip');
        } else if (!this.currentChannel.language) {
          return this.$tr('noLanguageSetError');
        } else if (this.isChanged) {
          return this.$tr('publishButtonTitle');
        } else {
          return this.$tr('noChangesText');
        }
      },
      showChannelMenu() {
        return this.$vuetify.breakpoint.xsOnly || this.canManage || this.isPublished;
      },
      viewChannelDetailsLink() {
        return {
          name: ChannelRouterNames.CHANNEL_DETAILS,
          query: {
            last: this.$route.name,
          },
          params: {
            ...this.$route.params,
            channelId: this.currentChannel.id,
          },
        };
      },
      editChannelLink() {
        return {
          name: ChannelRouterNames.CHANNEL_EDIT,
          query: {
            last: this.$route.name,
          },
          params: {
            ...this.$route.params,
            channelId: this.currentChannel.id,
          },
        };
      },
      trashLink() {
        return {
          name: RouterNames.TRASH,
          params: this.$route.params,
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
            last: this.$route.name,
          },
        };
      },
      showClipboardSpeedDial() {
        return this.$route.name !== RouterNames.STAGING_TREE_VIEW;
      },
    },
    $trs: {
      channelDetails: 'View channel details',
      editChannel: 'Edit channel details',
      openTrash: 'Open trash',
      getToken: 'Get token',
      shareChannel: 'Share channel',
      syncChannel: 'Sync resources',
      publishButton: 'Publish',
      publishButtonTitle: 'Make this channel available for import into Kolibri',
      viewOnly: 'View-only',
      apiGenerated: 'Generated by API',
      noChangesText: 'No changes found in channel',
      emptyChannelTooltip: 'You cannot publish an empty channel',
      noLanguageSetError: 'Missing channel language',
      incompleteDescendantsText:
        '{count, number, integer} {count, plural, one {resource is incomplete and cannot be published} other {resources are incomplete and cannot be published}}',
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

  .toolbar-icon-btn {
    margin-top: 10px;
  }

  .edit-channel-error {
    position: absolute;
    top: 22px;
    left: -8px;
  }

</style>
