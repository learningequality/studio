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
    <VListTile v-if="canEdit" @click="makeACopy">
      <VListTileTitle>{{ $tr('makeACopy') }}</VListTileTitle>
    </VListTile>
    <VListTile @click="copyToClipboard">
      <VListTileTitle>{{ $tr('copyToClipboard') }}</VListTileTitle>
    </VListTile>
    <VListTile v-if="canEdit" @click="removeItem">
      <VListTileTitle>{{ $tr('remove') }}</VListTileTitle>
    </VListTile>
  </VList>

</template>

<script>

  import { mapActions, mapGetters, mapMutations } from 'vuex';
  import { RouterNames } from '../constants';
  import translator from '../translator';
  import { RELATIVE_TREE_POSITIONS } from 'shared/data/constants';

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
      deepCopy() {
        return this.node.kind === 'topic';
      },
    },
    methods: {
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
      removeItem() {
        this.moveContentNodes({ ids: [this.nodeId], parent: this.trashId }).then(() => {
          this.$store.dispatch('showSnackbar', { text: this.$tr('removedItemsMessage') });
          this.$emit('removed');
        });
      },
      makeACopy() {
        this.$store.dispatch('showSnackbar', {
          text: translator.$tr(this.deepCopy ? 'creatingCopies' : 'creatingCopy'),
        });

        this.copyContentNode({
          id: this.nodeId,
          target: this.nodeId,
          position: RELATIVE_TREE_POSITIONS.RIGHT,
          deep: this.deepCopy,
        }).then(results => {
          const multiple = this.deepCopy ? results.length > 1 : false;
          this.$store.dispatch('showSnackbar', {
            text: translator.$tr(multiple ? 'copyCreated' : 'copiesCreated'),
          });
        });
      },
      copyToClipboard() {
        this.copy({ id: this.nodeId, deep: this.deepCopy }).then(() => {
          this.$store.dispatch('showSnackbar', {
            text: translator.$tr(`sentToClipboard`),
          });
        });
      },
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
      removedItemsMessage: 'Sent 1 item to the trash',
    },
  };

</script>

<style scoped>

</style>
