<template>

  <VList>
    <VListTile v-if="isTopic && canEdit" @click="newTopicNode">
      <VListTileTitle>{{ $tr('newSubtopic') }}</VListTileTitle>
    </VListTile>
    <VListTile v-if="canEdit" :to="editLink">
      <VListTileTitle>
        {{ isTopic? $tr('editTopicDetails') : $tr('editDetails') }}
      </VListTileTitle>
    </VListTile>
    <VListTile v-if="!hideDetailsLink" :to="viewLink">
      <VListTileTitle>{{ $tr('viewDetails') }}</VListTileTitle>
    </VListTile>
    <VListTile v-if="canEdit" @click.stop="setMoveNodes([nodeId])">
      <VListTileTitle>{{ $tr('move') }}</VListTileTitle>
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

  import { mapActions, mapGetters, mapMutations } from 'vuex';
  import { RouterNames } from '../constants';
  import { withChangeTracker } from 'shared/data/changes';

  export default {
    name: 'ContentNodeOptions',
    props: {
      nodeId: {
        type: String,
        required: true,
      },
      hideDetailsLink: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      ...mapGetters('currentChannel', ['canEdit', 'trashId']),
      ...mapGetters('contentNode', ['getContentNode']),
      node() {
        return this.getContentNode(this.nodeId);
      },
      isTopic() {
        return this.node.kind === 'topic';
      },
      editLink() {
        return {
          name: RouterNames.CONTENTNODE_DETAILS,
          params: {
            ...this.$route.params,
            detailNodeIds: this.nodeId,
          },
        };
      },
      viewLink() {
        return {
          name: RouterNames.TREE_VIEW,
          params: {
            ...this.$route.params,
            detailNodeId: this.nodeId,
          },
        };
      },
    },
    methods: {
      ...mapActions(['showSnackbar']),
      ...mapActions('contentNode', ['createContentNode', 'moveContentNodes', 'copyContentNode']),
      ...mapActions('clipboard', ['copy']),
      ...mapMutations('contentNode', { setMoveNodes: 'SET_MOVE_NODES' }),
      newTopicNode() {
        let nodeData = {
          parent: this.nodeId,
          kind: 'topic',
          title: this.$tr('topicDefaultTitle', { title: this.node.title }),
        };
        this.createContentNode(nodeData).then(newId => {
          this.$router.push({
            name: RouterNames.ADD_TOPICS,
            params: {
              ...this.$route.params,
              detailNodeIds: newId,
            },
          });
        });
      },
      removeNode: withChangeTracker(function(changeTracker) {
        return this.moveContentNodes({ id__in: [this.nodeId], parent: this.trashId }).then(() => {
          return this.showSnackbar({
            text: this.$tr('removedItems', { count: 1 }),
            actionText: this.$tr('undo'),
            actionCallback: () => changeTracker.revert(),
          });
        });
      }),
      copyToClipboard: withChangeTracker(function(changeTracker) {
        const count = 1;
        this.showSnackbar({
          duration: null,
          text: this.$tr('creatingClipboardCopies', { count: 1 }),
          actionText: this.$tr('cancel'),
          actionCallback: () => changeTracker.revert(),
        });

        return this.copy({ id: this.nodeId }).then(() => {
          const text = this.isTopic
            ? this.$tr('copiedTopicsToClipboard', { count })
            : this.$tr('copiedResourcesToClipboard', { count });

          return this.showSnackbar({
            text,
            actionText: this.$tr('undo'),
            actionCallback: () => changeTracker.revert(),
          });
        });
      }),
      duplicateNode: withChangeTracker(function(changeTracker) {
        const count = 1;
        this.showSnackbar({
          duration: null,
          text: this.$tr('creatingCopies', { count }),
          actionText: this.$tr('cancel'),
          actionCallback: () => changeTracker.revert(),
        });

        return this.copyContentNode({ id: this.nodeId, target: this.topicId, deep: true }).then(
          () => {
            const text = this.isTopic
              ? this.$tr('copiedTopics', { count })
              : this.$tr('copiedResources', { count });

            return this.showSnackbar({
              text,
              actionText: this.$tr('undo'),
              actionCallback: () => changeTracker.revert(),
            });
          }
        );
      }),
    },

    $trs: {
      topicDefaultTitle: '{title} topic',
      newSubtopic: 'New subtopic',
      editTopicDetails: 'Edit topic details',
      editDetails: 'Edit details',
      viewDetails: 'View details',
      move: 'Move',
      makeACopy: 'Make a copy',
      copyToClipboard: 'Copy to clipboard',
      remove: 'Remove',

      undo: 'Undo',
      cancel: 'Cancel',
      creatingCopies: 'Creating {count, plural,\n =1 {# copy}\n other {# copies}}...',
      creatingClipboardCopies:
        'Creating {count, plural,\n =1 {# copy}\n other {# copies}} on clipboard...',
      copiedTopics: 'Copied {count, plural,\n =1 {# topic}\n other {# topics}}',
      copiedResources: 'Copied {count, plural,\n =1 {# resource}\n other {# resources}}',
      copiedTopicsToClipboard:
        'Copied {count, plural,\n =1 {# topic}\n other {# topics}} to clipboard',
      copiedResourcesToClipboard:
        'Copied {count, plural,\n =1 {# resource}\n other {# resources}} to clipboard',
      removedItems: 'Sent {count, plural,\n =1 {# item}\n other {# items}} to the trash',
    },
  };

</script>

<style scoped>

</style>
