<template>
  <VListTile @click="selectNode">
    <VListTileAction>
      <VCheckbox color="primary" :value="isSelected" @click.stop="toggleNode" />
    </VListTileAction>
    <VListTileAction>
      <span v-if="node.changesStaged" class="changed">
        *
      </span>
    </VListTileAction>
    <VListTileAction>
      <ContentNodeIcon :kind="node.kind" />
    </VListTileAction>
    <VListTileContent>
      <VListTileTitle>
        {{ node.title }}
      </VListTileTitle>
    </VListTileContent>
  </VListTile>
</template>

<script>

  import { mapGetters, mapMutations, mapState } from 'vuex';
  import ContentNodeIcon from 'edit_channel/sharedComponents/ContentNodeIcon.vue';

  export default {
    name: 'EditListItem',
    $trs: {},
    components: {
      ContentNodeIcon,
    },
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
        deselectAll: 'RESET_SELECTED',
      }),
      toggleNode() {
        this.isSelected ? this.deselect(this.index) : this.select(this.index);
      },
      selectNode() {
        this.deselectAll();
        this.select(this.index);
      },
    },
  };

</script>

<style lang="less" scoped>

@import '../../../../less/global-variables.less';

.changed {
  font-weight: bold;
  color: @blue-500;
}

.v-list__tile__action {
  width: max-content;
  min-width: 0;
  padding-right: 5px;
}

</style>
