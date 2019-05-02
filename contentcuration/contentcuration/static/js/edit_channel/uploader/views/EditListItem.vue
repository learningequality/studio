<template>
  <VListTile @click="toggleNode">
    <VListTileAction>
      <VCheckbox color="primary" :value="isSelected" />
    </VListTileAction>
    <VListTileContent>
      <VListTileTitle>{{ node.title }}</VListTileTitle>
    </VListTileContent>
  </VListTile>
</template>

<script>

  import { mapGetters, mapMutations, mapState } from 'vuex';

  export default {
    name: 'EditListItem',
    $trs: {},
    props: {
      index: {
        type: Number,
        required: true,
      },
    },
    computed: {
      ...mapGetters('edit_modal', ['getNode']),
      ...mapState('edit_modal', ['selectedIndices']),
      node() {
        return this.getNode(this.index);
      },
      isSelected() {
        return _.contains(this.selectedIndices, this.index);
      },
    },
    methods: {
      ...mapMutations('edit_modal', {
        select: 'SELECT_NODE',
        deselect: 'DESELECT_NODE',
      }),
      toggleNode() {
        this.isSelected ? this.deselect(this.index) : this.select(this.index);
      },
    },
  };

</script>

<style lang="less" scoped>

</style>
