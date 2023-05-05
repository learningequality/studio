<template>

  <VList>
    <VListTile v-if="isTopic && canEdit" @click="newTopicNode">
      <VListTileTitle>{{ $tr('newSubtopic') }}</VListTileTitle>
    </VListTile>
    <VListTile v-if="canEdit && !hideEditLink" :to="editLink" @click="trackAction('Edit')">
      <VListTileTitle>
        {{ isTopic ? $tr('editTopicDetails') : $tr('editDetails') }}
      </VListTileTitle>
    </VListTile>
    <VListTile v-if="!hideDetailsLink" :to="viewLink" @click="trackAction('View')">
      <VListTileTitle>{{ $tr('viewDetails') }}</VListTileTitle>
    </VListTile>
    <VListTile v-if="canEdit" @click.stop="moveModalOpen = true">
      <VListTileTitle>{{ $tr('move') }}</VListTileTitle>
      <MoveModal
        v-if="moveModalOpen"
        ref="moveModal"
        v-model="moveModalOpen"
        :moveNodeIds="[nodeId]"
        @target="moveNode"
      />
    </VListTile>
    <VListTile v-if="canEdit" @click="duplicateNode()">
      <VListTileTitle>{{ $tr('makeACopy') }}</VListTileTitle>
    </VListTile>
    <VListTile @click="copyToClipboard()">
      <VListTileTitle>{{ $tr('copyToClipboard') }}</VListTileTitle>
    </VListTile>
    <VListTile v-if="canEdit" @click="removeNode()">
      <VListTileTitle>{{ $tr('remove') }}</VListTileTitle>
    </VListTile>
  </VList>

</template>

<script>

  import { mapActions, mapGetters } from 'vuex';
  import { RouteNames, TabNames } from '../constants';
  import MoveModal from './move/MoveModal';
  import { withChangeTracker } from 'shared/data/changes';
  import { RELATIVE_TREE_POSITIONS } from 'shared/data/constants';

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
      hideDetailsLink: {
        type: Boolean,
        default: false,
      },
      hideEditLink: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        moveModalOpen: false,
      };
    },
    computed: {
      ...mapGetters('currentChannel', ['canEdit', 'trashId']),
      ...mapGetters('contentNode', ['getContentNode', 'getContentNodeDescendants']),
      node() {
        return this.getContentNode(this.nodeId);
      },
      isTopic() {
        return this.node.kind === 'topic';
      },
      editLink() {
        return {
          name: RouteNames.CONTENTNODE_DETAILS,
          params: {
            ...this.$route.params,
            detailNodeIds: this.nodeId,
          },
        };
      },
      viewLink() {
        return {
          name: RouteNames.TREE_VIEW,
          params: {
            ...this.$route.params,
            detailNodeId: this.nodeId,
          },
        };
      },
    },
    watch: {
      moveModalOpen(open) {
        if (open) {
          this.trackAction('Move');
        }
      },
    },
    methods: {
      ...mapActions(['showSnackbar', 'clearSnackbar']),
      ...mapActions('contentNode', ['createContentNode', 'moveContentNodes', 'copyContentNode']),
      ...mapActions('clipboard', ['copy']),
      newTopicNode() {
        this.trackAction('New topic');
        const nodeData = {
          parent: this.nodeId,
          kind: 'topic',
        };
        this.createContentNode(nodeData).then(newId => {
          this.$router.push({
            name: RouteNames.ADD_TOPICS,
            params: {
              ...this.$route.params,
              detailNodeIds: newId,
              tab: TabNames.DETAILS,
            },
          });
        });
      },
      moveNode(target) {
        return this.moveContentNodes({ id__in: [this.nodeId], parent: target }).then(
          this.$refs.moveModal.moveComplete
        );
      },
      getRemoveNodeRedirect() {
        // Returns a callback to do appropriate post-removal navigation
        const { detailNodeId, nodeId } = this.$route.params;

        // If the NodePanel for one of the deleted nodes is open, close it
        if (detailNodeId === this.nodeId) {
          return () => this.$router.replace({ params: { detailNodeId: null } });
        }

        // If current topic or one of its ancestors is deleted, go to the parent
        // of the deleted topic
        if (
          nodeId === this.nodeId ||
          this.getContentNodeDescendants(this.nodeId).find(({ id }) => id === nodeId)
        ) {
          const parentId = this.getContentNode(this.nodeId).parent;
          return () => this.$router.replace({ params: { nodeId: parentId } });
        }

        // Otherwise, don't do anything
        return () => {};
      },
      removeNode: withChangeTracker(function(changeTracker) {
        this.trackAction('Delete');
        const redirect = this.getRemoveNodeRedirect();
        return this.moveContentNodes({ id__in: [this.nodeId], parent: this.trashId }).then(() => {
          redirect();
          this.showSnackbar({
            text: this.$tr('removedItems'),
            actionText: this.$tr('undo'),
            actionCallback: () => changeTracker.revert(),
          }).then(() => changeTracker.cleanUp());
        });
      }),
      copyToClipboard: withChangeTracker(function(changeTracker) {
        this.trackAction('Copy to clipboard');

        return this.copy({ node_id: this.node.node_id, channel_id: this.node.channel_id }).then(
          () => {
            this.showSnackbar({
              text: this.$tr('copiedToClipboardSnackbar'),
              // TODO: implement revert functionality for clipboard
              // actionText: this.$tr('undo'),
              // actionCallback: () => changeTracker.revert(),
            }).then(() => changeTracker.cleanUp());
          }
        );
      }),
      duplicateNode: withChangeTracker(function(changeTracker) {
        this.trackAction('Copy');
        this.showSnackbar({
          duration: null,
          text: this.$tr('creatingCopies'),
          // TODO: determine how to cancel copying while it's in progress,
          // TODO: if that's something we want
          // actionText: this.$tr('cancel'),
          // actionCallback: () => changeTracker.revert(),
        });

        return this.copyContentNode({
          id: this.nodeId,
          target: this.nodeId,
          position: RELATIVE_TREE_POSITIONS.RIGHT,
          wait_for_status: true,
        })
          .then(() => {
            this.showSnackbar({
              text: this.$tr('copiedSnackbar'),
              actionText: this.$tr('undo'),
              actionCallback: () => changeTracker.revert(),
            }).then(() => changeTracker.cleanUp());
          })
          .catch(() => {
            this.clearSnackbar();
            changeTracker.cleanUp();
          });
      }),
      trackAction(eventLabel) {
        this.$analytics.trackAction('channel_editor_node', 'Click', {
          eventLabel,
        });
      },
    },

    $trs: {
      newSubtopic: 'New folder',
      editTopicDetails: 'Edit folder details',
      editDetails: 'Edit details',
      viewDetails: 'View details',
      move: 'Move',
      makeACopy: 'Make a copy',
      copyToClipboard: 'Copy to clipboard',
      remove: 'Remove',
      undo: 'Undo',
      creatingCopies: 'Copying...',
      copiedSnackbar: 'Copy operation complete',
      copiedToClipboardSnackbar: 'Copied to clipboard',
      removedItems: 'Sent to trash',
    },
  };

</script>

<style scoped>

</style>
