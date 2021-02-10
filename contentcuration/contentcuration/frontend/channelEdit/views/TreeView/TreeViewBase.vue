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
        <router-link
          :to="viewChannelDetailsLink"
          @click="trackClickEvent('Summary')"
        >
          <IconButton
            class="toolbar-icon-btn"
            icon="info"
            :text="$tr('channelDetails')"
          />
        </router-link>
        <router-link
          :to="editChannelLink"
          @click="trackClickEvent('Edit channel')"
        >
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
            <div class="amber--text title" style="width: max-content;" v-on="on">
              {{ $formatNumber(errorsInChannel) }}
              <Icon color="amber">
                warning
              </Icon>
            </div>
          </template>
          <span>{{ $tr('incompleteDescendantsText', { count: errorsInChannel }) }}</span>
        </VTooltip>
      </div>
      <template v-if="$vuetify.breakpoint.smAndUp">
        <span v-if="canManage && isRicecooker" class="font-weight-bold grey--text subheading">
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
                :class="{ disabled: disablePublish }"
                :disabled="disablePublish"
                style="height: inherit;"
                @click.stop="publishChannel"
              >
                {{ $tr('publishButton') }}
              </VBtn>
            </div>
          </template>
          <span>{{ publishButtonTooltip }}</span>
        </VTooltip>
        <span v-else class="font-weight-bold grey--text subheading">
          {{ $tr('viewOnly') }}
        </span>
      </template>
      <VToolbarItems>
        <Menu v-if="showChannelMenu">
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
            <VListTile
              v-if="isPublished"
              @click="showTokenModal = true;"
            >
              <VListTileTitle>{{ $tr('getToken') }}</VListTileTitle>
            </VListTile>
            <VListTile
              v-if="canManage"
              :to="shareChannelLink"
              @click="trackClickEvent('Share channel')"
            >
              <VListTileTitle>{{ $tr('shareChannel') }}</VListTileTitle>
            </VListTile>
            <VListTile
              v-if="canEdit"
              @click="syncChannel"
            >
              <VListTileTitle>{{ $tr('syncChannel') }}</VListTileTitle>
            </VListTile>
            <VListTile
              v-if="canEdit"
              :to="trashLink"
              @click="trackClickEvent('Trash')"
            >
              <VListTileTitle>{{ $tr('openTrash') }}</VListTileTitle>
            </VListTile>
            <!-- HIDES THE DELETE OPTION UNTIL FUNCTIONALITY IS FIXED -->
            <!-- <VListTile
              v-if="canEdit"
              @click="deleteChannel"
            >
              <VListTileTitle class="red--text">
                {{ $tr('deleteChannel') }}
              </VListTileTitle>
            </VListTile> -->
          </VList>
        </Menu>
      </VToolbarItems>
      <template #extension>
        <slot name="extension"></slot>
      </template>
    </ToolBar>
    <MainNavigationDrawer v-model="drawer" />
    <slot></slot>

    <PublishModal v-if="showPublishModal" v-model="showPublishModal" />
    <ProgressModal v-model="showProgressModal" :syncing="syncing" :noSyncNeeded="noSyncNeeded" />
    <template v-if="isPublished">
      <ChannelTokenModal v-model="showTokenModal" :channel="currentChannel" />
    </template>
    <SyncResourcesModal
      v-if="currentChannel"
      v-model="showSyncModal"
      :channel="currentChannel"
      @syncing="syncInProgress"
      @nosync="noResourcesToSync"
    />
    <MessageDialog v-model="showDeleteModal" :header="$tr('deleteTitle')">
      {{ $tr('deletePrompt') }}
      <template #buttons="{ close }">
        <VSpacer />
        <VBtn color="primary" flat @click="close">
          {{ $tr('cancel') }}
        </VBtn>
        <VBtn color="primary" data-test="delete" @click="handleDelete">
          {{ $tr('deleteChannelButton') }}
        </VBtn>
      </template>
    </MessageDialog>
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
        <DraggableRegion
          :draggableUniverse="draggableUniverse"
          :draggableId="draggableId"
          :dropEffect="dropEffect"
          @draggableDrop="$emit('dropToClipboard', $event)"
        >
          <template #default>
            <VBtn v-model="showClipboard" fab class="clipboard-fab">
              <Icon>content_paste</Icon>
            </VBtn>
          </template>
        </DraggableRegion>
      </template>
    </VSpeedDial>
    <Clipboard
      :open="showClipboard"
      @close="showClipboard = false"
    />

    <!-- Dragging placeholder -->
    <DraggablePlaceholder :draggableUniverse="draggableUniverse">
      <template #default="{ metadata }">
        <VLayout class="px-4 py-3">
          <VFlex shrink>
            <ContentNodeIcon
              :kind="metadata.kind"
              :isEmpty="metadata.total_count === 0"
            />
          </VFlex>
          <VFlex
            class="px-2 subheading text text-truncate"
            :class="getTitleClass(metadata)"
          >
            {{ getTitle(metadata) }}
          </VFlex>
        </VLayout>
      </template>
    </DraggablePlaceholder>

  </VContainer>

</template>


<script>

  import { mapActions, mapGetters } from 'vuex';
  import { DraggableRegions, DraggableUniverses, RouterNames } from '../../constants';
  import PublishModal from '../../components/publish/PublishModal';
  import ProgressModal from '../progress/ProgressModal';
  import SyncResourcesModal from '../sync/SyncResourcesModal';
  import Clipboard from '../../components/Clipboard';
  import MainNavigationDrawer from 'shared/views/MainNavigationDrawer';
  import IconButton from 'shared/views/IconButton';
  import ToolBar from 'shared/views/ToolBar';
  import ChannelTokenModal from 'shared/views/channel/ChannelTokenModal';
  import OfflineText from 'shared/views/OfflineText';
  import ContentNodeIcon from 'shared/views/ContentNodeIcon';
  import MessageDialog from 'shared/views/MessageDialog';
  import { RouterNames as ChannelRouterNames } from 'frontend/channelList/constants';
  import { titleMixin } from 'shared/mixins';
  import DraggableRegion from 'shared/views/draggable/DraggableRegion';
  import { DropEffect } from 'shared/mixins/draggable/constants';
  import DraggablePlaceholder from 'shared/views/draggable/DraggablePlaceholder';

  export default {
    name: 'TreeViewBase',
    components: {
      DraggableRegion,
      IconButton,
      MainNavigationDrawer,
      ToolBar,
      PublishModal,
      ProgressModal,
      ChannelTokenModal,
      SyncResourcesModal,
      Clipboard,
      OfflineText,
      ContentNodeIcon,
      DraggablePlaceholder,
      MessageDialog,
    },
    mixins: [titleMixin],
    data() {
      return {
        drawer: false,
        showPublishModal: false,
        showTokenModal: false,
        showSyncModal: false,
        showProgressModal: false,
        showClipboard: false,
        showDeleteModal: false,
        syncing: false,
        noSyncNeeded: false,
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
        return (
          this.rootNode &&
          (this.rootNode.changed ||
            this.rootNode.has_updated_descendants ||
            this.rootNode.has_new_descendants)
        );
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
            tab: 'edit',
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
            tab: 'share',
          },
          query: {
            last: this.$route.name,
          },
        };
      },
      showClipboardSpeedDial() {
        return this.$route.name !== RouterNames.STAGING_TREE_VIEW;
      },
      draggableUniverse() {
        return DraggableUniverses.CONTENT_NODES;
      },
      draggableId() {
        return DraggableRegions.CLIPBOARD;
      },
      dropEffect() {
        return DropEffect.COPY;
      },
    },
    methods: {
      ...mapActions('channel', ['deleteChannel']),
      handleDelete() {
        this.deleteChannel(this.currentChannel.id).then(() => {
          localStorage.snackbar = this.$tr('channelDeletedSnackbar');
          window.location = window.Urls.base();
        });
      },
      syncChannel() {
        this.showSyncModal = true;
        this.trackClickEvent('Sync');
      },
      syncInProgress() {
        this.syncing = true;
        this.showProgressModal = true;
      },
      noResourcesToSync() {
        this.noSyncNeeded = true;
        this.showProgressModal = true;
      },
      deleteChannel() {
        this.showDeleteModal = true;
        this.trackClickEvent('Delete channel');
      },
      publishChannel() {
        this.showPublishModal = true;
        this.trackClickEvent('Publish');
      },
      trackClickEvent(eventLabel) {
        this.$analytics.trackClick('channel_editor_toolbar', eventLabel);
      },
    },
    $trs: {
      channelDetails: 'View channel details',
      editChannel: 'Edit channel details',
      openTrash: 'Open trash',
      getToken: 'Get token',
      shareChannel: 'Share channel',
      syncChannel: 'Sync resources',
      deleteChannel: 'Delete channel',
      publishButton: 'Publish',
      publishButtonTitle: 'Make this channel available for import into Kolibri',
      viewOnly: 'View-only',
      apiGenerated: 'Generated by API',
      noChangesText: 'No changes found in channel',
      emptyChannelTooltip: 'You cannot publish an empty channel',
      noLanguageSetError: 'Missing channel language',
      incompleteDescendantsText:
        '{count, number, integer} {count, plural, one {resource is incomplete and cannot be published} other {resources are incomplete and cannot be published}}',

      // Delete channel section
      deleteChannelButton: 'Delete channel',
      deleteTitle: 'Delete this channel',
      deletePrompt: 'This channel will be permanently deleted. This cannot be undone.',
      cancel: 'Cancel',
      channelDeletedSnackbar: 'Channel deleted',
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

  .drag-placeholder {
    position: absolute;
    z-index: 24;
    .text {
      width: 400px;
      max-width: 400px;
    }
  }

  .clipboard-fab.dragging-over.in-draggable-universe {
    animation: bounce 0.5s infinite alternate;

    @keyframes bounce {
      from {
        transform: translateY(0);
      }
      to {
        transform: translateY(-5px);
      }
    }
  }

</style>
