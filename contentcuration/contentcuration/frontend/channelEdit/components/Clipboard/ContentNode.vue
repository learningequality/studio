<template>

  <DraggableCollection
    v-if="contentNode"
    :draggableMetadata="contentNode"
    :dropEffect="dropEffectAndAllowed"
  >
    <LazyListGroup
      v-model="open"
      class="parent-item"
      subGroup
    >
      <template #header>
        <VHover>
          <ContextMenu slot-scope="{ hover }">
            <DraggableItem
              :draggableMetadata="contentNode"
              :dropEffect="dropEffectAndAllowed"
            >
              <DraggableHandle
                :effectAllowed="dropEffectAndAllowed"
              >
                <VListTile
                  class="content-item py-1"
                  :class="{ hover, selected }"
                  :style="{ 'padding-left': indentPadding }"
                  inactive
                >
                  <VListTileAction class="action-col">
                    <Checkbox
                      ref="checkbox"
                      class="mt-0 pt-0"
                      :value="selected"
                      :indeterminate="indeterminate"
                      @click.stop.prevent="goNextSelectionState"
                    />
                  </VListTileAction>
                  <div
                    class="py-2 thumbnail-col"
                  >
                    <Thumbnail
                      v-bind="thumbnailAttrs"
                      :isEmpty="contentNode.resource_count === 0"
                      compact
                    />
                  </div>

                  <template v-if="contentNode.kind === 'topic'">
                    <VListTileContent class="description-col pl-2 shrink">
                      <VListTileTitle class="text-truncate" :class="getTitleClass(contentNode)">
                        {{ getTitle(contentNode) }}
                      </VListTileTitle>
                    </VListTileContent>
                    <VListTileAction style="min-width: unset;" class="pl-3 pr-1">
                      <div class="badge caption font-weight-bold">
                        {{ contentNode.resource_count }}
                      </div>
                    </VListTileAction>
                    <!-- Custom placement of dropdown indicator -->
                    <VListTileAction
                      class="action-col px-1 v-list__group__header__append-icon"
                    >
                      <Icon>arrow_drop_down</Icon>
                    </VListTileAction>
                    <VSpacer />
                  </template>
                  <template v-else>
                    <VListTileContent class="description-col pa-2" @click="handlePreview">
                      <VListTileTitle class="text-truncate" :class="getTitleClass(contentNode)">
                        {{ getTitle(contentNode) }}
                      </VListTileTitle>
                    </VListTileContent>
                  </template>

                  <VListTileAction class="action-col option-col" :aria-hidden="!hover">
                    <Menu>
                      <template #activator="{ on }">
                        <VBtn
                          small
                          icon
                          flat
                          class="ma-0"
                          v-on="on"
                          @click.stop
                        >
                          <Icon>more_horiz</Icon>
                        </VBtn>
                      </template>

                      <ContentNodeOptions :nodeId="nodeId" :ancestorId="ancestorId" />
                    </Menu>
                  </VListTileAction>
                </VListTile>
              </DraggableHandle>
            </DraggableItem>
            <template v-if="contentNode" #menu>
              <ContentNodeOptions :nodeId="nodeId" :ancestorId="ancestorId" />
            </template>
          </ContextMenu>
        </VHover>
      </template>

      <ContentNode
        v-for="child in children"
        ref="children"
        :key="child.id"
        :nodeId="child.id"
        :level="level + 1"
        :ancestorId="childAncestorId"
      />

    </LazyListGroup>
  </DraggableCollection>

</template>
<script>

  import { mapActions } from 'vuex';
  import ContentNodeOptions from './ContentNodeOptions';
  import clipboardMixin, { parentMixin } from './mixins';
  import Checkbox from 'shared/views/form/Checkbox';
  import Thumbnail from 'shared/views/files/Thumbnail';
  import ContextMenu from 'shared/views/ContextMenu';
  import { titleMixin } from 'shared/mixins';
  import DraggableCollection from 'shared/views/draggable/DraggableCollection';
  import DraggableItem from 'shared/views/draggable/DraggableItem';
  import DraggableHandle from 'shared/views/draggable/DraggableHandle';
  import LazyListGroup from 'shared/views/LazyListGroup';
  import { EffectAllowed } from 'shared/mixins/draggable/constants';

  export default {
    name: 'ContentNode',
    components: {
      Checkbox,
      ContentNodeOptions,
      Thumbnail,
      ContextMenu,
      DraggableCollection,
      DraggableHandle,
      DraggableItem,
      LazyListGroup,
    },
    mixins: [clipboardMixin, parentMixin, titleMixin],
    data() {
      return {
        preloaded: false,
        open: false,
        hasOpened: false,
      };
    },
    computed: {
      thumbnailAttrs() {
        if (this.contentNode) {
          const {
            title,
            kind,
            thumbnail_src: src,
            thumbnail_encoding: encoding,
          } = this.contentNode;
          return { title, kind, src, encoding };
        }
        return {};
      },
      shouldPreload() {
        return this.contentNode && this.contentNode.total_count > 0;
      },
      loadClipboardNodesPayload() {
        return { parent: this.nodeId, ancestorId: this.childAncestorId };
      },
      dropEffectAndAllowed() {
        return EffectAllowed.COPY;
      },
    },
    watch: {
      open(open) {
        if (!this.shouldPreload) {
          return;
        }

        const children = this.$refs.children || [];
        if (open) {
          // If not loaded by the time the user clicks on this topic to open it,
          // then we'll trigger a load immediately
          if (!this.preloaded) {
            this.preloaded = true;
            this.cancelPreload();
            this.loadClipboardNodes(this.loadClipboardNodesPayload);
          } else if (this.hasOpened) {
            // If they perhaps opened the group, closed, then re-opened, make sure we
            // restart preload in the event it was cancelled.
            // Otherwise, this would happen in the mount
            children.forEach(child => child.startPreload());
          }
          this.hasOpened = true;
        } else if (!open) {
          children.forEach(child => child.cancelPreload());
        }
      },
    },
    mounted() {
      // Prefetch content node data. Since we're using `lazy` with the
      // nested VListGroup, this prefetches one level at a time!
      this.startPreload();
    },
    beforeDestroy() {
      this.cancelPreload();
    },
    methods: {
      ...mapActions('clipboard', ['setPreviewNode']),
      handlePreview() {
        this.setPreviewNode({ id: this.nodeId, ancestorId: this.ancestorId });
      },
      /**
       * @public
       */
      startPreload() {
        if (this.shouldPreload && !this.preloaded) {
          this.preloadClipboardNodes(this.loadClipboardNodesPayload).then(preloaded => {
            this.preloaded = preloaded || this.preloaded;
          });
        } else {
          this.preloaded = true;
        }
      },
      /**
       * @public
       */
      cancelPreload() {
        this.cancelPreloadClipboardNodes(this.loadClipboardNodesPayload);
      },
    },
  };

</script>
<style lang="less" scoped>

  .content-item,
  .v-list__tile {
    width: 100%;
    max-width: 100%;
    cursor: pointer;
    transition: background-color ease 0.3s;
  }

  .parent-item,
  .v-list__tile {
    width: 100%;
    max-width: 100%;
  }

  .badge {
    top: 0;
    width: max-content;
    min-width: 22px;
    padding: 0 3px;
    color: white;
    text-align: center;
    background-color: var(--v-primary-base);
    border-radius: 3px;
  }

  .content-item:hover,
  /deep/ .content-item > .v-list__tile:hover {
    background: #eeeeee;
  }

  /deep/ .action-col,
  .thumbnail-col {
    flex-shrink: 0;
    min-width: 24px;
  }

  .option-col {
    opacity: 0;
    transition: opacity ease 0.3s;

    .content-item.selected &,
    .content-item.hover & {
      opacity: 1;
    }
  }

  /deep/ .v-list__tile {
    padding-left: 11px;
  }

  /deep/ .v-list__tile__title {
    height: auto;
  }

  /deep/ .text-truncate {
    /* fix clipping of dangling characters */
    line-height: 1.3 !important;
  }

</style>
