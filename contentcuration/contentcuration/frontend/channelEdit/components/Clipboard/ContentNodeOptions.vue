<template>

  <VList>
    <VListTile :to="viewLink">
      <VListTileTitle>{{ $tr('goToOriginalLocation') }}</VListTileTitle>
    </VListTile>
    <VListTile @click="makeACopy">
      <VListTileTitle>{{ $tr('makeACopy') }}</VListTileTitle>
    </VListTile>
    <VListTile v-if="canEdit" @click.stop="setMoveNodes([nodeId])">
      <VListTileTitle>{{ $tr('moveTo') }}</VListTileTitle>
    </VListTile>
    <VListTile @click="removeItem">
      <VListTileTitle>{{ $tr('remove') }}</VListTileTitle>
    </VListTile>
  </VList>

</template>

<script>

  import { mapActions, mapGetters, mapMutations } from 'vuex';
  import { RouterNames } from '../../constants';
  import translator from '../../translator';

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
      ...mapGetters('currentChannel', ['trashRootId']),
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
      deepCopy() {
        return this.node.kind === 'topic';
      },
    },
    methods: {
      ...mapActions('contentNode', ['moveContentNodes']),
      ...mapActions('clipboard', ['copy']),
      ...mapMutations('contentNode', { setMoveNodes: 'SET_MOVE_NODES' }),
      removeItem() {
        this.moveContentNodes({ ids: [this.nodeId], parent: this.trashRootId }).then(() => {
          this.$store.dispatch('showSnackbar', { text: this.$tr('removedItemsMessage') });
          this.$emit('removed');
        });
      },
      makeACopy() {
        this.$store.dispatch('showSnackbar', {
          text: translator.$tr(this.deepCopy ? 'creatingCopies' : 'creatingCopy'),
        });

        this.copy({
          id: this.nodeId,
          target: this.sourceId,
          deep: this.deepCopy,
        }).then(results => {
          const multiple = this.deepCopy ? results.length > 1 : false;
          this.$store.dispatch('showSnackbar', {
            text: translator.$tr(multiple ? 'copyCreated' : 'copiesCreated'),
          });
        });
      },
    },

    $trs: {
      goToOriginalLocation: 'Go to original location',
      makeACopy: 'Make a copy',
      moveTo: 'Move to...',
      remove: 'Remove',
      removedItemsMessage: 'Removed from clipboard',
    },
  };

</script>

<style scoped>

</style>
