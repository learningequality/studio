<template>

  <VList>
    <VListTile :to="viewLink" target="_blank">
      <VListTileTitle>{{ $tr('goToOriginalLocation') }}</VListTileTitle>
    </VListTile>
    <VListTile @click="duplicateNode()">
      <VListTileTitle>{{ $tr('makeACopy') }}</VListTileTitle>
    </VListTile>
    <VListTile v-if="canEdit" @click.stop="setMoveNodes([sourceId])">
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
  import { ContentKindsNames } from 'shared/leUtils/ContentKinds';

  export default {
    name: 'ContentNodeOptions',
    props: {
      nodeId: {
        type: String,
        required: true,
      },
      sourceId: {
        type: String,
        required: true,
      },
    },
    computed: {
      ...mapGetters('channel', ['getChannel']),
      ...mapGetters('contentNode', ['getContentNode', 'getTreeNode']),
      treeNode() {
        return this.getTreeNode(this.sourceId);
      },
      node() {
        return this.getContentNode(this.sourceId);
      },
      channelId() {
        return this.treeNode.channel_id;
      },
      viewLink() {
        return {
          name: RouterNames.TREE_VIEW,
          params: {
            nodeId: this.treeNode.parent,
            detailNodeId: this.sourceId,
          },
        };
      },
      canEdit() {
        return this.getChannel(this.channelId) && this.getChannel(this.channelId).edit;
      },
      isTopic() {
        return this.node.kind === ContentKindsNames.TOPIC;
      },
    },
    methods: {
      ...mapActions(['showSnackbar']),
      ...mapActions('clipboard', ['copy']),
      ...mapActions('contentNode', ['deleteContentNodes']),
      ...mapMutations('contentNode', { setMoveNodes: 'SET_MOVE_NODES' }),
      removeNode: withChangeTracker(function(changeTracker) {
        this.showSnackbar({
          duration: null,
          text: this.$tr('removingItems', { count: 1 }),
          actionText: this.$tr('cancel'),
          actionCallback: () => changeTracker.revert(),
        });

        return this.deleteContentNodes([this.nodeId]).then(() => {
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
          text: this.$tr('creatingCopies', { count: 1 }),
          actionText: this.$tr('cancel'),
          actionCallback: () => changeTracker.revert(),
        });

        return this.copy({
          id: this.sourceId,
          deep: this.isTopic,
        }).then(() => {
          return this.showSnackbar({
            text: this.$tr('copiedItemsToClipboard', { count: 1 }),
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
      remove: 'Remove',
      undo: 'Undo',
      cancel: 'Cancel',
      creatingCopies: 'Creating {count, plural,\n =1 {# copy}\n other {# copies}}...',
      copiedItemsToClipboard:
        'Copied {count, plural,\n =1 {# item}\n other {# items}} to clipboard',
      removingItems: 'Removing {count, plural,\n =1 {# item}\n other {# items}}...',
      removedFromClipboard: 'Removed from clipboard',
    },
  };

</script>

<style scoped>

</style>
