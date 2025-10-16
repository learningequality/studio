<template>

  <FullscreenModal
    v-model="dialog"
    lazy
  >
    <template #header>
      {{ moveHeader }}
      <b
        v-if="currentNode"
        class="notranslate"
      >{{ currentNode.title }}</b>
    </template>
    <ToolBar
      v-if="!loading"
      color="white"
      light
    >
      <Breadcrumbs
        :items="crumbs"
        class="py-0"
      >
        <template #item="{ item, isLast }">
          <span
            style="cursor: pointer"
            :class="[isLast ? 'font-weight-bold' : 'grey--text', getTitleClass(item)]"
            @click="targetNodeId = item.id"
          >
            {{ getTitle(item) }}
          </span>
        </template>
      </Breadcrumbs>
      <VSpacer />
      <KButton
        class="add-topic-btn"
        :text="$tr('addTopic')"
        data-test="newtopic"
        @click="showNewTopicModal = true"
      />
    </ToolBar>
    <!-- list of children content -->
    <LoadingText
      v-if="loading"
      data-test="loading"
    />
    <VContainer
      v-else-if="!children.length"
      data-test="empty"
      class="pa-0"
      fluid
      fill-height
    >
      <VLayout
        align-center
        justify-center
        class="subheading"
      >
        <div>{{ $tr('emptyTopicText') }}</div>
      </VLayout>
    </VContainer>
    <VLayout
      v-else
      row
      align-content-start
      style="height: calc(100vh - 192px)"
    >
      <VFlex style="height: inherit; overflow-y: auto">
        <VList>
          <template v-for="(node, index) in children">
            <VListTile
              :key="`move-node-${node.id}`"
              class="content-card"
              row
              align-center
              :class="{ disabled: isDisabled(node) }"
              data-test="listitem"
              @click="handleClick(node)"
            >
              <VListTileContent
                class="px-4 py-3"
                style="max-width: min-content"
              >
                <div style="width: 150px">
                  <Thumbnail
                    :src="node.thumbnail_src"
                    :kind="node.kind"
                    :isEmpty="!node.total_count"
                    maxWidth="100%"
                  />
                </div>
              </VListTileContent>
              <VListTileContent class="px-2">
                <VListTileTitle
                  class="text-truncate title"
                  :class="getTitleClass(node)"
                >
                  {{ getTitle(node) }}
                </VListTileTitle>
                <VListTileSubTitle
                  v-if="node.kind === 'topic'"
                  class="grey--text"
                >
                  {{ $tr('resourcesCount', { count: node.resource_count || 0 }) }}
                </VListTileSubTitle>
              </VListTileContent>
              <VListTileAction style="min-width: 102px">
                <div class="options">
                  <VBtn
                    icon
                    data-test="details"
                    class="mx-1"
                    @click.stop="previewNodeId = node.id"
                  >
                    <Icon
                      icon="info"
                      style="font-size: 20px"
                      :color="$themeTokens.primary"
                    />
                  </VBtn>
                  <VBtn
                    v-if="node.kind === 'topic'"
                    icon
                    class="mx-1 rtl-flip"
                    @click.stop="targetNodeId = node.id"
                  >
                    <Icon icon="chevronRight" />
                  </VBtn>
                </div>
              </VListTileAction>
            </VListTile>
            <VDivider
              v-if="index < children.length - 1"
              :key="`move-divider-${node.id}`"
            />
          </template>
        </VList>
        <div class="show-more-button-container">
          <KButton
            v-if="more"
            :disabled="moreLoading"
            @click="loadMore"
          >
            {{ showMoreLabel }}
          </KButton>
        </div>
      </VFlex>
      <ResourceDrawer
        :nodeId="previewNodeId"
        :channelId="currentChannel.id"
        @close="previewNodeId = null"
      />
    </VLayout>

    <!-- footer buttons -->
    <template #bottom>
      <VSpacer />
      <KCircularLoader
        v-if="moveHereButtonDisabled && moveNodesInProgress"
        :size="20"
      />
      <KButtonGroup>
        <KButton
          appearance="flat-button"
          :text="$tr('cancel')"
          data-test="cancel"
          @click="dialog = false"
        />
        <KButton
          :primary="true"
          :text="$tr('moveHere')"
          :disabled="moveHereButtonDisabled"
          data-test="move"
          @click="moveNodes"
        />
      </KButtonGroup>
    </template>

    <NewTopicModal
      v-if="showNewTopicModal"
      v-model="showNewTopicModal"
      data-test="newtopicmodal"
      @createTopic="createTopic"
    />
  </FullscreenModal>

</template>


<script>

  import { mapGetters, mapActions } from 'vuex';
  import ResourceDrawer from '../ResourceDrawer';
  import { RouteNames } from '../../constants';
  import NewTopicModal from './NewTopicModal';
  import Breadcrumbs from 'shared/views/Breadcrumbs';
  import LoadingText from 'shared/views/LoadingText';
  import ToolBar from 'shared/views/ToolBar';
  import FullscreenModal from 'shared/views/FullscreenModal';
  import Thumbnail from 'shared/views/files/Thumbnail';
  import { ContentKindsNames } from 'shared/leUtils/ContentKinds';
  import { titleMixin } from 'shared/mixins';
  import { createTranslator } from 'shared/i18n';

  // Can't use cross component translator to get the NodePanel translations
  // here, because the NodePanel component imports this component.
  const showMoreTranslator = createTranslator('NodePanel', {
    showMore: 'Show more',
  });

  export default {
    name: 'MoveModal',
    components: {
      NewTopicModal,
      Breadcrumbs,
      LoadingText,
      ResourceDrawer,
      ToolBar,
      FullscreenModal,
      Thumbnail,
    },
    mixins: [titleMixin],
    props: {
      value: {
        type: Boolean,
        required: true,
      },
      moveNodeIds: {
        type: Array,
        default: () => [],
      },
      // Set to true to modify behavior for TrashModal
      movingFromTrash: {
        type: Boolean,
        default: false,
      },
      clipboardTopicResourceCount: {
        type: Object,
        default: () => ({}),
      },
    },
    data() {
      return {
        showNewTopicModal: false,
        loading: false,
        more: null,
        moreLoading: false,
        moveNodesInProgress: false,
        targetNodeId: null,
        previewNodeId: null,
      };
    },
    computed: {
      ...mapGetters('currentChannel', ['currentChannel', 'rootId']),
      ...mapGetters('contentNode', [
        'getContentNode',
        'getContentNodeChildren',
        'getContentNodeAncestors',
        'getTopicAndResourceCounts',
      ]),
      dialog: {
        get() {
          return this.value;
        },
        set(open) {
          this.$emit('input', open);
        },
      },
      moveHeader() {
        const resourceCounts = Object.keys(this.clipboardTopicResourceCount).length
          ? this.clipboardTopicResourceCount
          : this.getTopicAndResourceCounts(this.moveNodeIds);
        return this.$tr('moveItems', resourceCounts);
      },
      moveHereButtonDisabled() {
        if (this.moveNodesInProgress) {
          return true;
        } else if (!this.movingFromTrash && this.currentLocationId === this.targetNodeId) {
          return true;
        }
        return false;
      },
      currentLocationId() {
        // If opening modal from inside TrashModal, begin navigation at root node
        if (this.movingFromTrash) {
          return this.currentChannel && this.currentChannel.root_id;
        }
        const contentNode = this.getContentNode(this.moveNodeIds[0]);
        return contentNode && contentNode.parent;
      },
      currentNode() {
        return this.getContentNode(this.targetNodeId);
      },
      children() {
        return this.getContentNodeChildren(this.targetNodeId);
      },
      crumbs() {
        return this.getContentNodeAncestors(this.targetNodeId, true) || [];
      },
      showMoreLabel() {
        // eslint-disable-next-line kolibri/vue-no-undefined-string-uses
        return showMoreTranslator.$tr('showMore');
      },
    },
    watch: {
      targetNodeId() {
        this.previewNodeId = null;
        this.$nextTick(() => {
          this.getChildren();
        });
      },
    },
    created() {
      this.targetNodeId = this.currentLocationId || this.rootId;
    },
    methods: {
      ...mapActions('contentNode', ['createContentNode', 'loadChildren', 'loadContentNodes']),
      isDisabled(node) {
        return this.moveNodeIds.includes(node.id);
      },
      handleClick(node) {
        if (node.kind === ContentKindsNames.TOPIC) {
          this.targetNodeId = node.id;
        } else {
          this.previewNodeId = node.id;
        }
      },
      goToLocation() {
        this.$router.push({
          name: RouteNames.TREE_VIEW,
          params: {
            nodeId: this.targetNodeId,
          },
        });
      },
      getChildren() {
        if (this.currentNode && this.currentNode.total_count) {
          this.loading = true;
          return this.loadChildren({
            parent: this.targetNodeId,
            root_id: this.rootId,
          }).then(childrenResponse => {
            this.loading = false;
            this.more = childrenResponse.more || null;
          });
        }
        return Promise.resolve();
      },
      createTopic(title) {
        this.createContentNode({ parent: this.targetNodeId, kind: 'topic', title }).then(id => {
          this.showNewTopicModal = false;
          this.$store.dispatch('showSnackbar', { text: this.$tr('topicCreatedMessage') });
          this.targetNodeId = id;
        });
      },
      moveNodes() {
        this.moveNodesInProgress = true;
        this.$emit('target', this.targetNodeId);
      },
      /**
       * Called once the move is complete
       * @public
       */
      moveComplete() {
        this.dialog = false;
        this.$store.dispatch('showSnackbar', {
          text: this.$tr('movedMessage', { title: this.currentNode.title }),
          actionText: this.$tr('goToLocationButton'),
          actionCallback: this.goToLocation,
        });
        this.moveNodesInProgress = false;
      },
      loadMore() {
        if (this.more && !this.moreLoading) {
          this.moreLoading = true;
          this.loadContentNodes(this.more).then(response => {
            this.more = response.more || null;
            this.moreLoading = false;
          });
        }
      },
    },
    $trs: {
      moveItems:
        'Move {topicCount, plural,\n =1 {# folder}\n other {# folders}}, {resourceCount, plural,\n =1 {# resource}\n other {# resources}} into:',
      addTopic: 'Add new folder',
      cancel: 'Cancel',
      moveHere: 'Move here',
      resourcesCount: '{count, plural,\n =1 {# resource}\n other {# resources}}',
      emptyTopicText: 'No resources found',
      topicCreatedMessage: 'New folder created',
      movedMessage: 'Moved to {title}',
      goToLocationButton: 'Go to location',
    },
  };

</script>


<style lang="scss" scoped>

  ::v-deep .v-toolbar__extension {
    padding: 0;
  }

  .content-card {
    ::v-deep .v-list__tile {
      height: unset;
    }

    .options {
      display: none;
    }

    &.disabled {
      pointer-events: none;
      opacity: 0.4;
    }

    &:not(.disabled) {
      cursor: pointer;
    }

    &:hover {
      .options {
        display: block;
      }
    }
  }

  .show-more-button-container {
    display: flex;
    justify-content: center;
    width: 100%;
    margin-bottom: 10px;
  }

  .add-topic-btn {
    flex-shrink: 0;
  }

</style>
