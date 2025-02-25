<template>

  <VList>
    <VListTile
      :href="viewLink"
      target="_blank"
      @click="track('Edit')"
    >
      <VListTileTitle>{{ $tr('goToOriginalLocation') }}</VListTileTitle>
    </VListTile>
    <VListTile
      v-if="!isLegacy"
      @click="duplicateNode()"
    >
      <VListTileTitle>{{ $tr('makeACopy') }}</VListTileTitle>
    </VListTile>
    <VListTile
      v-if="allowMove"
      @click.stop="calculateMoveNodes"
    >
      <VListTileTitle>{{ $tr('moveTo') }}</VListTileTitle>
      <MoveModal
        v-if="moveModalOpen"
        ref="moveModal"
        v-model="moveModalOpen"
        :clipboardTopicResourceCount="topicAndResourceCount"
        @target="moveNodes"
      />
    </VListTile>
    <VListTile @click="removeNode()">
      <VListTileTitle>{{ $tr('remove') }}</VListTileTitle>
    </VListTile>
  </VList>

</template>


<script>

  import { mapActions, mapGetters, mapState } from 'vuex';
  import { RouteNames } from '../../constants';
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
      ...mapState('clipboard', ['clipboardNodesMap']),
      ...mapGetters('clipboard', ['getMoveTrees', 'isLegacyNode']),
      isLegacy() {
        return this.isLegacyNode(this.nodeId);
      },
      channelId() {
        // this.contentNode is the source node, so for legacy since legacy nodes exist on the
        // clipboard, we should use the source field, otherwise just `channel_id`
        return this.isLegacy ? this.contentNode.source_channel_id : this.contentNode.channel_id;
      },
      viewLink() {
        const channelURI = window.Urls.channel(this.channelId);
        const sourceNode = this.$router.resolve({
          name: RouteNames.TREE_VIEW,
          params: {
            nodeId: this.contentNode.parent,
            detailNodeId: this.contentNode.id,
          },
        });
        return `${channelURI}${sourceNode.href}`;
      },
      topicAndResourceCount() {
        let topicCount = 0;
        let resourceCount = 0;
        if (this.contentNode.kind === 'topic') {
          topicCount = 1;
          resourceCount = Object.values(this.clipboardNodesMap).filter(
            node => node.parent === this.nodeId,
          ).length;
        } else {
          resourceCount = 1;
        }
        return { topicCount: topicCount, resourceCount: resourceCount };
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
      removeNode: withChangeTracker(function (changeTracker) {
        this.track('Delete');

        return this.deleteClipboardNode({
          id: this.nodeId,
        }).then(() => {
          this.showSnackbar({
            text: this.$tr('removedFromClipboard'),
            // TODO: implement revert functionality for clipboard
            // actionText: this.$tr('undo'),
            // actionCallback: () => changeTracker.revert(),
          }).then(() => changeTracker.cleanUp());
        });
      }),
      duplicateNode: withChangeTracker(function (changeTracker) {
        this.track('Copy');

        return this.copyAll({
          nodes: [this.contentNode],
        }).then(() => {
          this.showSnackbar({
            text: this.$tr('copiedItemsToClipboard'),
            // TODO: implement revert functionality for clipboard
            // actionText: this.$tr('undo'),
            // actionCallback: () => changeTracker.revert(),
          }).then(() => changeTracker.cleanUp());
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
      // undo: 'Undo',
      copiedItemsToClipboard: 'Copied in clipboard',
      removedFromClipboard: 'Deleted from clipboard',
    },
  };

</script>


<style scoped></style>
