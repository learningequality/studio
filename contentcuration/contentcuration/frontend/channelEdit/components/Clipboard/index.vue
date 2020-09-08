<template>

  <VExpandXTransition>
    <ResizableNavigationDrawer
      v-if="open"
      right
      :localName="localName"
      :minWidth="400"
      :maxWidth="700"
      permanent
      clipped
      class="clipboard elevation-4"
      v-bind="$attrs"
    >
      <VLayout class="container pa-0 ma-0" column>
        <ToolBar
          class="header pa-0 ma-0"
          color="white"
          :flat="!elevated"
        >
          <VListTile class="grow">
            <VListTileAction>
              <Checkbox
                ref="checkbox"
                class="ma-0 pa-0"
                :value="selected"
                :label="selectionState ? '' : $tr('selectAll')"
                :indeterminate="indeterminate"
                @click.stop.prevent="goNextSelectionState"
              />
            </VListTileAction>
            <VListTileContent>
              <VSlideXTransition>
                <div v-if="selectionState">
                  <IconButton
                    v-if="canEdit"
                    icon="swap_horiz"
                    :text="$tr('moveSelectedButton')"
                    @click="moveNodes()"
                  />
                  <IconButton
                    icon="content_copy"
                    :text="$tr('duplicateSelectedButton')"
                    @click="duplicateNodes()"
                  />
                  <IconButton
                    icon="remove_circle_outline"
                    :text="$tr('deleteSelectedButton')"
                    @click="removeNodes()"
                  />
                </div>
              </VSlideXTransition>
            </VListTileContent>
            <VSpacer />
            <VListTileAction style="min-width: 24px">
              <IconButton
                class="ma-0"
                icon="close"
                :text="$tr('close')"
                @click="$emit('close')"
              />
            </VListTileAction>
          </VListTile>
        </ToolBar>
        <LoadingText v-if="refreshing" absolute />
        <VLayout
          v-else
          ref="nodeList"
          class="node-list elevation-0"
          @scroll="scroll"
        >
          <VList focusable>
            <template v-for="channelId in channelIds">
              <Channel :key="channelId" :nodeId="channelId" />
            </template>
          </VList>
        </VLayout>
      </VLayout>
    </ResizableNavigationDrawer>
  </VExpandXTransition>

</template>
<script>

  import { mapGetters, mapActions, mapMutations } from 'vuex';
  import { SelectionFlags } from '../../vuex/clipboard/constants';
  import Channel from './Channel';
  import clipboardMixin from './mixins';
  import ResizableNavigationDrawer from 'shared/views/ResizableNavigationDrawer';
  import Checkbox from 'shared/views/form/Checkbox';
  import IconButton from 'shared/views/IconButton';
  import ToolBar from 'shared/views/ToolBar';
  import LoadingText from 'shared/views/LoadingText';
  import { promiseChunk } from 'shared/utils';
  import { withChangeTracker } from 'shared/data/changes';

  export default {
    name: 'Clipboard',
    components: {
      ResizableNavigationDrawer,
      Channel,
      Checkbox,
      IconButton,
      ToolBar,
      LoadingText,
    },
    mixins: [clipboardMixin],
    props: {
      // key for sessionStorage to store width data at
      localName: {
        type: String,
        default: 'clipboard',
      },
      open: {
        type: Boolean,
        default: false,
      },
      // For the underlying mixin
      // eslint-disable-next-line kolibri/vue-no-unused-properties
      nodeId: {
        type: String,
        default() {
          return this.clipboardRootId;
        },
      },
    },
    data() {
      return {
        refreshing: false,
        elevated: false,
      };
    },
    computed: {
      ...mapGetters(['clipboardRootId']),
      ...mapGetters('clipboard', [
        'channelIds',
        'selectedNodes',
        'selectedChannels',
        'getCopyTrees',
      ]),
      selectedNodeIds() {
        return this.selectedNodes.map(([sid]) => sid);
      },
      canEdit() {
        return !this.selectedChannels.find(channel => !channel.edit);
      },
      selected() {
        return Boolean(this.selectionState & SelectionFlags.ALL_DESCENDANTS);
      },
      // Overrides mixin, since entire clipboard tree cannot be selected
      // eslint-disable-next-line kolibri/vue-no-unused-properties
      nextSelectionState() {
        const current = this.selectionState;

        return current === SelectionFlags.NONE || current & SelectionFlags.INDETERMINATE
          ? SelectionFlags.SELECTED | SelectionFlags.ALL_DESCENDANTS
          : SelectionFlags.NONE;
      },
    },
    watch: {
      open(open) {
        if (open) {
          this.refresh();
        }
      },
    },
    methods: {
      ...mapActions(['showSnackbar']),
      ...mapMutations('contentNode', { setMoveNodes: 'SET_MOVE_NODES' }),
      ...mapActions('clipboard', ['loadChannels', 'copy', 'deleteClipboardNodes']),
      refresh() {
        if (this.refreshing) {
          return;
        }

        this.refreshing = true;
        this.loadChannels().then(() => (this.refreshing = false));
      },
      scroll() {
        this.elevated = this.$refs.nodeList.scrollTop > 0;
      },
      moveNodes() {
        if (!this.selectedNodeIds.length) {
          return;
        }

        this.setMoveNodes(this.selectedNodes.map(([, n]) => n.id));
      },
      duplicateNodes: withChangeTracker(function(changeTracker) {
        const trees = this.getCopyTrees();

        if (!trees.length) {
          return Promise.resolve([]);
        }

        this.showSnackbar({
          duration: null,
          text: this.$tr('creatingClipboardCopies'),
          actionText: this.$tr('cancel'),
          actionCallback: () => changeTracker.revert(),
        });

        return promiseChunk(trees, 1, ([tree]) => {
          // `tree` is exactly the params for copy
          return this.copy(tree);
        }).then(() => {
          return this.showSnackbar({
            text: this.$tr('copiedItemsToClipboard'),
            actionText: this.$tr('undo'),
            actionCallback: () => changeTracker.revert(),
          });
        });
      }),
      removeNodes: withChangeTracker(function(changeTracker) {
        const id__in = this.selectedNodeIds;

        if (!id__in.length) {
          return Promise.resolve([]);
        }

        this.showSnackbar({
          duration: null,
          text: this.$tr('removingItems'),
          actionText: this.$tr('cancel'),
          actionCallback: () => changeTracker.revert(),
        });

        return this.deleteClipboardNodes(id__in).then(() => {
          return this.showSnackbar({
            text: this.$tr('removedFromClipboard'),
            actionText: this.$tr('undo'),
            actionCallback: () => changeTracker.revert(),
          });
        });
      }),
    },
    $trs: {
      selectAll: 'Select all',
      undo: 'Undo',
      cancel: 'Cancel',
      close: 'Close',
      duplicateSelectedButton: 'Make a copy',
      moveSelectedButton: 'Move',
      deleteSelectedButton: 'Delete',
      removingItems: 'Deleting from clipboard...',
      removedFromClipboard: 'Deleted from clipboard',
      creatingClipboardCopies: 'Copying in clipboard...',
      copiedItemsToClipboard: 'Copied in clipboard',
    },
  };

</script>
<style lang="less" scoped>

  .clipboard {
    position: absolute;
    background: rgb(250, 250, 250) !important;
  }

  .container,
  /deep/ .drawer-contents {
    max-height: 100vh;
  }

  .node-list,
  .header {
    position: relative;
  }

  .header {
    z-index: 4;
  }

  /deep/ .header .v-list__tile {
    border-left: 5px solid transparent;
  }

  .node-list {
    max-width: 100%;
    overflow: auto;
  }

  .v-list {
    width: 100%;
    max-width: 100%;
    padding: 0 0 64px;
  }

  .channel-item:nth-child(n + 2) {
    background-color: #f9f9f9;
  }

  /deep/ .v-toolbar__content {
    padding: 0;
  }

  /deep/ .v-list__group--active::before {
    background: none !important;
  }

  /deep/ .channel-item:last-child::after {
    background: rgba(0, 0, 0, 0.12) !important;
  }

</style>
