<template>

  <VList>
    <VListTile :to="viewLink" target="_blank">
      <VListTileTitle>{{ $tr('goToOriginalLocation') }}</VListTileTitle>
    </VListTile>
    <VListTile @click="duplicateNode()">
      <VListTileTitle>{{ $tr('makeACopy') }}</VListTileTitle>
    </VListTile>
    <VListTile v-if="canEdit" @click.stop="moveNode">
      <VListTileTitle>{{ $tr('moveTo') }}</VListTileTitle>
    </VListTile>
    <VListTile @click="removeNode()">
      <VListTileTitle>{{ $tr('remove') }}</VListTileTitle>
    </VListTile>
  </VList>

</template>

<script>

  import { mapActions, mapGetters, mapMutations } from 'vuex';
  import { RouterNames } from '../../constants';
  import { withChangeTracker } from 'shared/data/changes';

  export default {
    name: 'ContentNodeOptions',
    props: {
      nodeId: {
        type: String,
        required: true,
      },
      ancestorId: {
        type: String,
        default: null,
      },
    },
    computed: {
      ...mapGetters('channel', ['getChannel']),
      ...mapGetters('clipboard', ['getClipboardNodeForRender', 'getCopyTrees']),
      node() {
        return this.getClipboardNodeForRender(this.nodeId);
      },
      channelId() {
        return this.node.channel_id;
      },
      viewLink() {
        return {
          name: RouterNames.TREE_VIEW,
          params: {
            nodeId: this.node.parent,
            detailNodeId: this.node.id,
          },
        };
      },
      canEdit() {
        return this.getChannel(this.channelId) && this.getChannel(this.channelId).edit;
      },
    },
    methods: {
      ...mapActions(['showSnackbar']),
      ...mapActions('clipboard', ['copy', 'deleteClipboardNode']),
      ...mapMutations('clipboard', { setCopyNodes: 'SET_CLIPBOARD_MOVE_NODES' }),
      moveNode() {
        const copyTrees = this.getCopyTrees(this.nodeId, this.ancestorId, true);
        this.setCopyNodes(copyTrees);
      },
      removeNode: withChangeTracker(function(changeTracker) {
        this.showSnackbar({
          duration: null,
          text: this.$tr('removingItems', { count: 1 }),
          actionText: this.$tr('cancel'),
          actionCallback: () => changeTracker.revert(),
        });

        return this.deleteClipboardNode({
          clipboardNodeId: this.nodeId,
          ancestorId: this.ancestorId,
        }).then(() => {
          return this.showSnackbar({
            text: this.$tr('removedFromClipboard'),
            actionText: this.$tr('undo'),
            actionCallback: () => changeTracker.revert(),
          });
        });
      }),
      duplicateNode: withChangeTracker(function(changeTracker) {
        this.showSnackbar({
          duration: null,
          text: this.$tr('creatingCopies'),
          actionText: this.$tr('cancel'),
          actionCallback: () => changeTracker.revert(),
        });

        return this.copy({
          node_id: this.node.node_id,
          channel_id: this.node.channel_id,
        }).then(() => {
          return this.showSnackbar({
            text: this.$tr('copiedItemsToClipboard'),
            actionText: this.$tr('undo'),
            actionCallback: () => changeTracker.revert(),
          });
        });
      }),
    },
    $trs: {
      goToOriginalLocation: 'Go to original location',
      makeACopy: 'Make a copy',
      moveTo: 'Move to...',
      remove: 'Delete',
      undo: 'Undo',
      cancel: 'Cancel',
      creatingCopies: 'Copying in clipboard...',
      copiedItemsToClipboard: 'Copied in clipboard',
      removingItems: 'Deleting from clipboard...',
      removedFromClipboard: 'Deleted from clipboard',
    },
  };

</script>

<style scoped>

</style>
