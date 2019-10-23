<template>
  <VListTile :class="{selected: isSelected}" @click.stop="setNode(index)">
    <VListTileAction>
      <VCheckbox color="primary" :inputValue="isSelected" @click.stop="toggleNode" />
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
    <VListTileAction v-if="!nodeIsValid">
      <VIcon color="red" class="error-icon">
        error
      </VIcon>
    </VListTileAction>
    <VListTileAction v-if="removable">
      <VBtn icon small flat class="remove-item" @click.stop="removeNode(index)">
        <VIcon>clear</VIcon>
      </VBtn>
    </VListTileAction>
  </VListTile>
</template>

<script>

  import { mapActions, mapGetters, mapMutations, mapState } from 'vuex';
  import { modes } from '../constants';
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
      ...mapState('edit_modal', ['mode', 'selectedIndices']),
      node() {
        return this.getNode(this.index);
      },
      isSelected() {
        return this.selectedIndices.includes(this.index);
      },
      nodeIsValid() {
        if (this.mode === modes.VIEW_ONLY) {
          return true;
        }

        return !this.invalidNodes({ ignoreNewNodes: true }).includes(this.index);
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

  .selected {
    background-color: @gray-200;
  }

  .remove-item {
    color: @gray-500 !important;
    &:hover {
      color: @red-error-color !important;
    }
  }

  .error-icon {
    font-size: 14pt !important;
  }

</style>
