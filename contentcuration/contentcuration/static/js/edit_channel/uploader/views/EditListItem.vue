<template>
  <VListTile :class="{invalid: !nodeIsValid}" @click.stop="setNode(index)">
    <VListTileAction>
      <VCheckbox color="primary" :value="isSelected" @click.stop="toggleNode" />
    </VListTileAction>
    <VListTileAction v-if="node.changesStaged" class="changed">
      *
    </VListTileAction>
    <VListTileAction>
      <ContentNodeIcon :kind="node.kind" />
    </VListTileAction>
    <VListTileContent>
      <VListTileTitle>
        {{ node.title }}
      </VListTileTitle>
    </VListTileContent>
    <VSpacer />
    <VListTileAction v-if="removable">
      <VBtn icon small flat class="remove-item" @click.stop="removeNode(index)">
        <VIcon>clear</VIcon>
      </VBtn>
    </VListTileAction>
  </VListTile>
</template>

<script>

  import _ from 'underscore';
  import { mapActions, mapGetters, mapMutations, mapState } from 'vuex';
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
      removable: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      ...mapGetters('edit_modal', ['getNode', 'invalidNodes']),
      ...mapState('edit_modal', ['selectedIndices']),
      node() {
        return this.getNode(this.index);
      },
      isSelected() {
        return _.contains(this.selectedIndices, this.index);
      },
      nodeIsValid() {
        return !_.contains(this.invalidNodes, this.index);
      },
    },
    methods: {
      ...mapMutations('edit_modal', {
        select: 'SELECT_NODE',
        deselect: 'DESELECT_NODE',
        setNode: 'SET_NODE',
      }),
      ...mapActions('edit_modal', ['removeNode']),
      toggleNode() {
        this.isSelected ? this.deselect(this.index) : this.select(this.index);
      },
    },
  };

</script>

<style lang="less" scoped>

  @import '../../../../less/global-variables.less';

  .v-list__tile__action {
    min-width: 30px;
    &.changed {
      min-width: 15px;
      font-weight: bold;
      color: @blue-500;
    }
  }

  .invalid {
    background-color: @red-bg-color;
  }

  .remove-item {
    color: @gray-500;
    &:hover {
      color: @red-error-color;
    }
  }

</style>
