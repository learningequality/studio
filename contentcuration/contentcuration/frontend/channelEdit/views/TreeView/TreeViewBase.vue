<template>

  <VContainer
    fluid
    class="pa-0"
  >
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
      <VToolbarItems
        v-if="$vuetify.breakpoint.smAndUp"
        class="ml-4"
      >
        <KRouterLink
          :to="viewChannelDetailsLink"
          @click="trackClickEvent('Summary')"
        >
          <KIconButton
            class="toolbar-icon-btn"
            :tooltip="$tr('channelDetails')"
            icon="info"
          />
        </KRouterLink>
        <KRouterLink
          :to="editChannelLink"
          @click="trackClickEvent('Edit channel')"
        >
          <VBadge color="transparent">
            <template #badge>
              <Icon
                v-if="!currentChannel.language"
                color="red"
                icon="error"
                class="edit-channel-error"
              />
            </template>
            <KIconButton
              v-if="canEdit"
              class="toolbar-icon-btn"
              icon="edit"
              :tooltip="$tr('editChannel')"
            />
          </VBadge>
        </KRouterLink>
      </VToolbarItems>
      <VSpacer />
      <SavingIndicator v-if="!offline" />
      <OfflineText indicator />
      <ProgressModal />
      <div
        v-if="errorsInChannel && canEdit"
        class="mx-1"
      >
        <VTooltip
          bottom
          lazy
        >
          <template #activator="{ on }">
            <div
              class="amber--text title"
              style="width: max-content"
              v-on="on"
            >
              {{ $formatNumber(errorsInChannel) }}
              <KIcon icon="warningIncomplete" />
            </div>
          </template>
          <span>{{ $tr('incompleteDescendantsText', { count: errorsInChannel }) }}</span>
        </VTooltip>
      </div>
      <template v-if="$vuetify.breakpoint.smAndUp">
        <span
          v-if="canManage && isRicecooker"
          class="font-weight-bold grey--text subheading"
        >
          {{ $tr('apiGenerated') }}
        </span>
        <VTooltip
          v-if="!loading && canManage"
          bottom
          attach="body"
          lazy
        >
          <template #activator="{ on }">
            <!-- Need to wrap in div to enable tooltip when button is disabled -->
            <div
              style="height: 100%"
              v-on="on"
            >
              <VBtn
                color="primary"
                flat
                class="ma-0"
                :class="{ disabled: disablePublish }"
                :disabled="disablePublish"
                style="height: inherit"
                @click.stop="publishChannel"
              >
                {{ $tr('publishButton') }}
              </VBtn>
            </div>
          </template>
          <span>{{ publishButtonTooltip }}</span>
        </VTooltip>
        <span
          v-else-if="!loading"
          class="font-weight-bold grey--text subheading"
        >
          {{ $tr('viewOnly') }}
        </span>
      </template>
      <VToolbarItems>
        <BaseMenu v-if="showChannelMenu">
          <template #activator="{ on }">
            <VBtn
              flat
              icon
              v-on="on"
            >
              <Icon
                icon="optionsHorizontal"
                style="font-size: 25px"
              />
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
              <VListTile
                v-if="canEdit"
                :to="editChannelLink"
              >
                <VListTileTitle>
                  {{ $tr('editChannel') }}
                  <Icon
                    v-if="!currentChannel.language"
                    class="mx-1"
                    color="red"
                    icon="error"
                    style="vertical-align: baseline"
                  />
                </VListTileTitle>
              </VListTile>
            </template>
            <VListTile
              v-if="isPublished"
              @click="showTokenModal = true"
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
            <VListTile
              v-if="canEdit"
              @click="deleteChannelModal"
            >
              <VListTileTitle class="red--text">
                {{ $tr('deleteChannel') }}
              </VListTileTitle>
            </VListTile>
          </VList>
        </BaseMenu>
      </VToolbarItems>
      <template #extension>
        <slot name="extension"></slot>
      </template>
    </ToolBar>
    <MainNavigationDrawer
      v-model="drawer"
      color="white"
    />
    <slot></slot>

    <PublishModal
      v-if="showPublishModal"
      v-model="showPublishModal"
    />
    <template v-if="isPublished">
      <ChannelTokenModal
        v-model="showTokenModal"
        :channel="currentChannel"
      />
    </template>
    <SyncResourcesModal
      v-if="currentChannel"
      v-model="showSyncModal"
      :channel="currentChannel"
      @syncing="syncInProgress"
    />
    <QuickEditModal />
    <MessageDialog
      v-model="showDeleteModal"
      :header="$tr('deleteTitle')"
    >
      {{ $tr('deletePrompt') }}
      <template #buttons="{ close }">
        <VSpacer />
        <VBtn
          color="primary"
          flat
          @click="close"
        >
          {{ $tr('cancel') }}
        </VBtn>
        <VBtn
          color="primary"
          data-test="delete"
          @click="handleDelete"
        >
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
            <VBtn
              v-model="showClipboard"
              fab
              class="clipboard-fab"
            >
              <Icon
                icon="clipboard"
                style="font-size: 25px"
              />
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

  import { mapActions, mapGetters, mapState } from 'vuex';
  import Clipboard from '../../components/Clipboard';
  import SyncResourcesModal from '../sync/SyncResourcesModal';
  import ProgressModal from '../progress/ProgressModal';
  import PublishModal from '../../components/publish/PublishModal';
  import QuickEditModal from '../../components/QuickEditModal';
  import SavingIndicator from '../../components/edit/SavingIndicator';
  import { DraggableRegions, DraggableUniverses, RouteNames } from '../../constants';
  import MainNavigationDrawer from 'shared/views/MainNavigationDrawer';
  import ToolBar from 'shared/views/ToolBar';
  import ChannelTokenModal from 'shared/views/channel/ChannelTokenModal';
  import OfflineText from 'shared/views/OfflineText';
  import ContentNodeIcon from 'shared/views/ContentNodeIcon';
  import MessageDialog from 'shared/views/MessageDialog';
  import { RouteNames as ChannelRouteNames } from 'frontend/channelList/constants';
  import { titleMixin } from 'shared/mixins';
  import DraggableRegion from 'shared/views/draggable/DraggableRegion';
  import { DropEffect } from 'shared/mixins/draggable/constants';
  import DraggablePlaceholder from 'shared/views/draggable/DraggablePlaceholder';

  export default {
    name: 'TreeViewBase',
    components: {
      DraggableRegion,
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
      SavingIndicator,
      QuickEditModal,
    },
    mixins: [titleMixin],
    props: {
      loading: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        drawer: false,
        showPublishModal: false,
        showTokenModal: false,
        showSyncModal: false,
        showClipboard: false,
        showDeleteModal: false,
        syncing: false,
      };
    },
    computed: {
      ...mapState({
        offline: state => !state.connection.online,
      }),
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
          this.currentChannel &&
          (this.currentChannel.unpublished_changes || (this.isRicecooker && this.rootNode.changed))
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
          this.currentChannel.publishing ||
          !this.isChanged ||
          !this.currentChannel.language ||
          (this.rootNode && !this.rootNode.resource_count)
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
        return (
          !this.loading && (this.$vuetify.breakpoint.xsOnly || this.canManage || this.isPublished)
        );
      },
      viewChannelDetailsLink() {
        return {
          name: ChannelRouteNames.CHANNEL_DETAILS,
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
          name: ChannelRouteNames.CHANNEL_EDIT,
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
          name: RouteNames.TRASH,
          params: this.$route.params,
        };
      },
      shareChannelLink() {
        return {
          name: ChannelRouteNames.CHANNEL_EDIT,
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
        return this.$route.name !== RouteNames.STAGING_TREE_VIEW;
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
    watch: {
      rootId: {
        handler(id) {
          if (!id) {
            this.loadChannel().catch(() => {
              this.$store.dispatch('showSnackbarSimple', 'Failed to load channel');
            });
          }
        },
        immediate: true,
      },
    },
    methods: {
      ...mapActions('channel', ['deleteChannel']),
      ...mapActions('currentChannel', ['loadChannel']),
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
      },
      deleteChannelModal() {
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
      noLanguageSetError: 'Channel language is required',
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


<style lang="scss" scoped>

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
