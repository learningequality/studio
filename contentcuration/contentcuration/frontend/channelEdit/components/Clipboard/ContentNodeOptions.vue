<template>

  <VList>
    <VListTile :href="viewLink" target="_blank" @click="track('Edit')">
      <VListTileTitle>{{ $tr('goToOriginalLocation') }}</VListTileTitle>
    </VListTile>
    <VListTile v-if="!isLegacy" @click="duplicateNode()">
      <VListTileTitle>{{ $tr('makeACopy') }}</VListTileTitle>
    </VListTile>
    <VListTile v-if="allowMove" @click.stop="calculateMoveNodes">
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
  import { RouterNames } from '../../constants';
  import MoveModal from '../move/MoveModal';
  import clipboardMixin from './mixins';
  import { withChangeTracker } from 'shared/data/changes';

  export default {
    name: 'ContentNodeOptions',
    components: {
      MoveModal,
    },
    mixins: [clipboardMixin],
    data() {
      return {
        moveModalOpen: false,
        newTrees: [],
        legacyTrees: [],
      };
    },
    computed: {
      ...mapGetters('clipboard', ['getMoveTrees', 'isLegacyNode']),
      isLegacy() {
        return this.isLegacyNode(this.nodeId);
      },
      channelId() {
        return this.isLegacy ? this.contentNode.source_channel_id : this.contentNode.channel_id;
      },
      viewLink() {
        const channelURI = window.Urls.channel(this.channelId);
        const sourceNode = this.$router.resolve({
          name: RouterNames.TREE_VIEW,
          params: {
            nodeId: this.contentNode.parent,
            detailNodeId: this.contentNode.id,
          },
        });
        return `${channelURI}${sourceNode.href}`;
      },
    },
    methods: {
      ...mapActions(['showSnackbar']),
      ...mapActions('clipboard', ['copyAll', 'deleteClipboardNode', 'moveClipboardNodes']),
      calculateMoveNodes() {
        const trees = this.getMoveTrees(this.nodeId, true);

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
          id: this.nodeId,
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

        return this.copyAll({
          nodes: [this.contentNode],
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
