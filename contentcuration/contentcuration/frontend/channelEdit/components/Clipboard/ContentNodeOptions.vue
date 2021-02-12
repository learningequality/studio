<template>

  <VList>
    <VListTile :href="viewLink" target="_blank" @click="track('Edit')">
      <VListTileTitle>{{ $tr('goToOriginalLocation') }}</VListTileTitle>
    </VListTile>
    <VListTile v-if="!legacyNode(nodeId)" @click="duplicateNode()">
      <VListTileTitle>{{ $tr('makeACopy') }}</VListTileTitle>
    </VListTile>
    <VListTile v-if="canEdit" @click.stop="calculateMoveNodes">
      <VListTileTitle>{{ $tr('moveTo') }}</VListTileTitle>
      <MoveModal v-if="moveModalOpen" ref="moveModal" v-model="moveModalOpen" @target="moveNodes" />
    </VListTile>
    <VListTile @click="removeNode()">
      <VListTileTitle>{{ $tr('remove') }}</VListTileTitle>
    </VListTile>
  </VList>

</template>

<script>

  import { mapActions, mapGetters } from 'vuex';
  import { RouteNames } from '../../constants';
  import MoveModal from '../move/MoveModal';
  import { withChangeTracker } from 'shared/data/changes';

  export default {
    name: 'ContentNodeOptions',
    components: {
      MoveModal,
    },
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
    data() {
      return {
        moveModalOpen: false,
        newTrees: [],
        legacyTrees: [],
      };
    },
    computed: {
      ...mapGetters('channel', ['getChannel']),
      ...mapGetters('clipboard', ['getClipboardNodeForRender', 'getMoveTrees', 'legacyNode']),
      node() {
        return this.getClipboardNodeForRender(this.nodeId, this.ancestorId);
      },
      channelId() {
        return this.node.channel_id;
      },
      viewLink() {
        const channelURI = window.Urls.channel(this.channelId);
        const sourceNode = this.$router.resolve({
          name: RouteNames.TREE_VIEW,
          params: {
            nodeId: this.node.parent,
            detailNodeId: this.node.id,
          },
        });
        return `${channelURI}${sourceNode.href}`;
      },
      canEdit() {
        return this.getChannel(this.channelId) && this.getChannel(this.channelId).edit;
      },
    },
    methods: {
      ...mapActions(['showSnackbar']),
      ...mapActions('clipboard', ['copy', 'deleteClipboardNode', 'moveClipboardNodes']),
      calculateMoveNodes() {
        const trees = this.getMoveTrees(this.nodeId, this.ancestorId, true);

        this.legacyTrees = trees.legacyTrees;

        this.newTrees = trees.newTrees;

        if (this.legacyTrees.length || this.newTrees.length) {
          this.moveModalOpen = true;
        }

        this.track('Move');
      },
      moveNodes(target) {
        this.moveClipboardNodes({
          legacyTrees: this.legacyTrees,
          newTrees: this.newTrees,
          target,
        }).then(this.$refs.moveModal.moveComplete);
      },
      removeNode: withChangeTracker(function(changeTracker) {
        this.track('Delete');
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
        this.track('Copy');
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
      track(label) {
        this.$analytics.trackClick('clipboard_options', label);
      },
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
