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
    <VListTile v-if="canEdit" @click.stop>
      <VListTileTitle>{{ $tr('makeACopy') }}</VListTileTitle>
    </VListTile>
    <VListTile @click.stop>
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
      ...mapActions('contentNode', ['createContentNode', 'moveContentNodes']),
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
