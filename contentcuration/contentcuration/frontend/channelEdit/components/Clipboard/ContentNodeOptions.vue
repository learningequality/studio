<template>

  <VList>
    <VListTile :to="viewLink">
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
  import commonStrings from '../../translator';
  import { withChangeTracker } from 'shared/data/changes';

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
        return this.node.kind === 'topic';
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
          text: commonStrings.$tr(`removingItems`, { count: 1 }),
          actionText: commonStrings.$tr(`cancel`),
          actionCallback: () => changeTracker.revert(),
        });

        return this.deleteContentNodes([this.nodeId]).then(() => {
          return this.showSnackbar({
            text: commonStrings.$tr(`removedFromClipboard`),
            actionText: commonStrings.$tr(`undo`),
            actionCallback: () => changeTracker.revert(),
          });
        });
      }),
      duplicateNode: withChangeTracker(function(changeTracker) {
        this.showSnackbar({
          duration: null,
          text: commonStrings.$tr(`creatingCopies`, { count: 1 }),
          actionText: commonStrings.$tr(`cancel`),
          actionCallback: () => changeTracker.revert(),
        });

        return this.copy({
          id: this.sourceId,
          deep: this.isTopic,
        }).then(() => {
          return this.showSnackbar({
            text: commonStrings.$tr(`copiedItemsToClipboard`, { count: 1 }),
            actionText: commonStrings.$tr(`undo`),
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
    },
  };

</script>

<style scoped>

</style>
