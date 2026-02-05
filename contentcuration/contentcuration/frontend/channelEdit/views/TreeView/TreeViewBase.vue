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
      <SavingIndicator v-if="!offline && !isDraftPublishing" />
      <OfflineText indicator />
      <ProgressModal />
      <div
        v-if="errorsInChannel && canEdit"
        class="mx-1"
      >
        <div
          ref="errorCount"
          class="amber--text title"
          style="width: max-content"
        >
          {{ $formatNumber(errorsInChannel) }}
          <KIcon icon="warningIncomplete" />
        </div>
        <KTooltip
          reference="errorCount"
          :refs="$refs"
          placement="bottom"
        >
          <span>{{ $tr('incompleteDescendantsText', { count: errorsInChannel }) }}</span>
        </KTooltip>
      </div>
      <template v-if="$vuetify.breakpoint.smAndUp">
        <span
          v-if="canManage && isRicecooker"
          class="font-weight-bold grey--text subheading"
        >
          {{ $tr('apiGenerated') }}
        </span>
        <KButton
          v-if="canShareChannel"
          :text="$tr('shareMenuButton')"
          hasDropdown
          class="share-button"
        >
          <template #menu>
            <KDropdownMenu
              :options="shareMenuOptions"
              @select="handleShareMenuSelect"
            />
          </template>
        </KButton>
        <!-- Need to wrap in div to enable tooltip when button is disabled -->
        <div
          v-if="!loading && canManage"
          ref="publishButton"
          style="height: 100%"
        >
          <KButton
            :text="$tr('publishButton')"
            :primary="true"
            appearance="flat-button"
            class="ma-0"
            :class="{ disabled: disablePublish }"
            :disabled="disablePublish"
            style="height: inherit"
            @click="publishChannel"
          />
        </div>
        <KTooltip
          v-if="!loading && canManage"
          reference="publishButton"
          :refs="$refs"
          placement="bottom"
        >
          <span>{{ publishButtonTooltip }}</span>
        </KTooltip>
        <span
          v-else-if="!loading"
          class="font-weight-bold grey--text subheading"
        >
          {{ $tr('viewOnly') }}
        </span>
      </template>
      <VToolbarItems>
        <KIconButton
          v-if="showChannelMenu"
          class="toolbar-icon-btn"
          icon="optionsHorizontal"
          :tooltip="$tr('moreOptions')"
        >
          <template #menu>
            <KDropdownMenu
              :options="channelMenuOptions"
              @select="handleChannelMenuSelect"
            />
          </template>
        </KIconButton>
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

    <PublishSidePanel
      v-if="showPublishSidePanel"
      @close="showPublishSidePanel = false"
      @showResubmitCommunityLibraryModal="handleShowResubmitToCommunityLibraryModal"
    />
    <SubmitToCommunityLibrarySidePanel
      v-if="showSubmitToCommunityLibrarySidePanel"
      :channel="currentChannel"
      @close="showSubmitToCommunityLibrarySidePanel = false"
    />
    <ResubmitToCommunityLibraryModal
      v-if="resubmitToCommunityLibraryModalData"
      :channel="resubmitToCommunityLibraryModalData.channel"
      :latestSubmissionVersion="resubmitToCommunityLibraryModalData.latestSubmissionVersion"
      @resubmit="handleResubmitToCommunityLibrary"
      @close="handleDismissResubmitToCommunityLibrary"
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
    <RemoveChannelModal
      v-if="showDeleteModal && currentChannel"
      :channel-id="currentChannel.id"
      :can-edit="canEdit"
      data-test="delete-modal"
      @delete="handleDelete"
      @close="showDeleteModal = false"
    />
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

  import QuickEditModal from '../../components/QuickEditModal';
  import SavingIndicator from '../../components/edit/SavingIndicator';
  import { DraggableRegions, DraggableUniverses, RouteNames } from '../../constants';
  import PublishSidePanel from '../../components/sidePanels/PublishSidePanel';
  import SubmitToCommunityLibrarySidePanel from '../../components/sidePanels/SubmitToCommunityLibrarySidePanel';
  import ResubmitToCommunityLibraryModal from '../../components/modals/ResubmitToCommunityLibraryModal';
  import MainNavigationDrawer from 'shared/views/MainNavigationDrawer';
  import ToolBar from 'shared/views/ToolBar';
  import ChannelTokenModal from 'shared/views/channel/ChannelTokenModal';
  import RemoveChannelModal from 'shared/views/channel/RemoveChannelModal';
  import OfflineText from 'shared/views/OfflineText';
  import ContentNodeIcon from 'shared/views/ContentNodeIcon';
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
      PublishSidePanel,
      SubmitToCommunityLibrarySidePanel,
      ResubmitToCommunityLibraryModal,
      ProgressModal,
      ChannelTokenModal,
      RemoveChannelModal,
      SyncResourcesModal,
      Clipboard,
      OfflineText,
      ContentNodeIcon,
      DraggablePlaceholder,
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
        showPublishSidePanel: false,
        showSubmitToCommunityLibrarySidePanel: false,
        showTokenModal: false,
        showSyncModal: false,
        showClipboard: false,
        showDeleteModal: false,
        syncing: false,
        resubmitToCommunityLibraryModalData: null,
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
      isDraftPublishing() {
        return (
          this.currentChannel &&
          this.currentChannel.publishing &&
          this.currentChannel.publishing_draft
        );
      },
      disablePublish() {
        return (
          (this.currentChannel.publishing && !this.currentChannel.publishing_draft) ||
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
      canShareChannel() {
        return this.canManage || this.isPublished;
      },
      canSubmitToCommunityLibrary() {
        if (!this.currentChannel) {
          return false;
        }
        return this.canManage && this.isPublished && !this.currentChannel.public;
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
      shareMenuOptions() {
        const options = [];
        if (this.canSubmitToCommunityLibrary) {
          options.push({
            label: this.$tr('submitToCommunityLibrary'),
            value: 'submit-to-library',
          });
        }
        if (this.canManage) {
          options.push({
            label: this.$tr('inviteCollaborators'),
            value: 'invite-collaborators',
          });
        }
        if (this.isPublished) {
          options.push({
            label: this.$tr('shareToken'),
            value: 'share-token',
          });
        }
        return options;
      },
      channelMenuOptions() {
        const options = [];

        if (this.$vuetify.breakpoint.xsOnly) {
          if (this.canManage) {
            options.push({
              label: this.$tr('publishButton'),
              value: 'publish',
              disabled: this.disablePublish,
            });
          }
          options.push({
            label: this.$tr('channelDetails'),
            value: 'view-details',
          });
          if (this.canEdit) {
            let label = this.$tr('editChannel');
            if (!this.currentChannel.language) {
              label = `${label}`;
            }
            options.push({
              label,
              value: 'edit-channel',
            });
          }

          if (this.canSubmitToCommunityLibrary) {
            options.push({
              label: this.$tr('submitToCommunityLibrary'),
              value: 'submit-to-library',
            });
          }
          if (this.canManage) {
            options.push({
              label: this.$tr('inviteCollaborators'),
              value: 'invite-collaborators',
            });
          }
          if (this.isPublished) {
            options.push({
              label: this.$tr('shareToken'),
              value: 'share-token',
            });
          }
        } else {
          if (this.isPublished) {
            options.push({
              label: this.$tr('getToken'),
              value: 'get-token',
            });
          }
          if (this.canManage) {
            options.push({
              label: this.$tr('shareChannel'),
              value: 'share-channel',
            });
          }
        }

        if (this.canEdit) {
          options.push({
            label: this.$tr('syncChannel'),
            value: 'sync',
          });
          options.push({
            label: this.$tr('openTrash'),
            value: 'trash',
          });
          options.push({
            label: this.$tr('deleteChannel'),
            value: 'delete',
          });
        }

        return options;
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
        this.showPublishSidePanel = true;
        this.trackClickEvent('Publish');
      },
      handleResubmitToCommunityLibrary() {
        this.showSubmitToCommunityLibrarySidePanel = true;
      },
      handleDismissResubmitToCommunityLibrary() {
        this.resubmitToCommunityLibraryModalData = null;
      },
      handleShowResubmitToCommunityLibraryModal(resubmitData) {
        if (resubmitData?.latestSubmissionVersion == null) {
          return;
        }
        this.resubmitToCommunityLibraryModalData = resubmitData;
      },
      trackClickEvent(eventLabel) {
        this.$analytics.trackClick('channel_editor_toolbar', eventLabel);
      },
      handleShareMenuSelect(option) {
        if (option.value === 'submit-to-library') {
          this.showSubmitToCommunityLibrarySidePanel = true;
        } else if (option.value === 'invite-collaborators') {
          this.trackClickEvent('Share channel');
          this.$router.push(this.shareChannelLink);
        } else if (option.value === 'share-token') {
          this.showTokenModal = true;
        }
      },
      handleChannelMenuSelect(option) {
        switch (option.value) {
          case 'publish':
            this.showPublishSidePanel = true;
            break;
          case 'view-details':
            this.$router.push(this.viewChannelDetailsLink);
            break;
          case 'edit-channel':
            this.$router.push(this.editChannelLink);
            break;
          case 'submit-to-library':
            this.showSubmitToCommunityLibrarySidePanel = true;
            break;
          case 'invite-collaborators':
            this.trackClickEvent('Share channel');
            this.$router.push(this.shareChannelLink);
            break;
          case 'share-token':
            this.showTokenModal = true;
            break;
          case 'get-token':
            this.showTokenModal = true;
            break;
          case 'share-channel':
            this.trackClickEvent('Share channel');
            this.$router.push(this.shareChannelLink);
            break;
          case 'sync':
            this.syncChannel();
            break;
          case 'trash':
            this.trackClickEvent('Trash');
            this.$router.push(this.trashLink);
            break;
          case 'delete':
            this.deleteChannelModal();
            break;
        }
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

      // Share menu section
      shareMenuButton: 'Share',
      submitToCommunityLibrary: 'Submit to community library',
      inviteCollaborators: 'Invite collaborators',
      shareToken: 'Share token',

      // More options menu
      moreOptions: 'More options',

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

  .share-button {
    margin-right: 8px;
    margin-left: 8px;
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
