<template>
  <VListTile :disabled="!isValid" @click.stop="setNode(index)">
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
      removable: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        validationRules: [
          item => !!item.title, // Title is required
          item => {
            // License is required for resources
            return item.freeze_authoring_data || item.kind === 'topic' || !!item.license;
          },
          item => {
            // Copyright holder is required for certain licenses
            return (
              item.freeze_authoring_data ||
              item.kind === 'topic' ||
              !item.license.copyright_holder_required ||
              !!item.copyright_holder
            );
          },
          item => {
            // License description is required for certain licenses
            return (
              item.freeze_authoring_data ||
              item.kind === 'topic' ||
              !item.license.is_custom ||
              !!item.license_description
            );
          },
        ],
      };
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
    },
    methods: {
      ...mapMutations('edit_modal', {
        select: 'SELECT_NODE',
        deselect: 'DESELECT_NODE',
        setNode: 'SET_NODE',
        removeNode: 'REMOVE_NODE',
      }),
      toggleNode() {
        this.isSelected ? this.deselect(this.index) : this.select(this.index);
      },
      validate() {
        // _.each(this.validationRules, (rule) => rule(this.node));
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
