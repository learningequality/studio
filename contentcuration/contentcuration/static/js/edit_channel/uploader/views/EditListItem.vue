<template>
  <VListTile :disabled="!isValid" :class="{invalid: !nodeIsValid}" @click.stop="setNode(index)">
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
      ...mapGetters('edit_modal', ['getNode']),
      ...mapState('edit_modal', ['selectedIndices', 'isValid']),
      node() {
        return this.getNode(this.index);
      },
      isSelected() {
        return _.contains(this.selectedIndices, this.index);
      },
      nodeIsValid() {
        // Title is required
        if (!this.node.title) {
          return false;
        }

        // Authoring information is required for resources
        if (!this.node.freeze_authoring_data && this.node.kind !== 'topic') {
          // License is required
          if (!this.node.license) {
            return false;
          }
          // Copyright holder is required for certain licenses
          else if (this.node.license.copyright_holder_required && !this.node.copyright_holder) {
            return false;
          }
          // License description is required for certain licenses
          else if (this.license.is_custom && !this.node.license_description) {
            return false;
          }
        }

        return true;
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

  .remove-item {
    color: @gray-500;
    &:hover {
      color: @red-error-color;
    }
  }

</style>
