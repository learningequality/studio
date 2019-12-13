<template>

  <VListTile :style="{backgroundColor: backgroundColor}" @click.stop="setNode(index)">
    <VListTileAction>
      <VCheckbox color="primary" :inputValue="isSelected" @click.stop="toggleNode" />
    </VListTileAction>
    <VListTileAction v-if="node.changesStaged" class="changed">
      *
    </VListTileAction>
    <VListTileAction style="min-width:min-content;">
      <ContentNodeIcon :kind="node.kind" :showColor="false" />
    </VListTileAction>
    <VListTileContent>
      <VListTileTitle>
        {{ node.title }}
      </VListTileTitle>
      <VListTileSubTitle v-if="subtitleText">
        {{ subtitleText }}
      </VListTileSubTitle>
    </VListTileContent>
    <VSpacer />
    <VListTileAction class="status-indicator">
      <FileStatus :fileIDs="fileIDs">
        <slot name="default">
          <VIcon v-if="!nodeIsValid" color="red" class="error-icon">
            error
          </VIcon>
        </slot>
      </FileStatus>
    </VListTileAction>
    <VListTileAction v-if="removable">
      <VBtn
        icon
        small
        flat
        color="grey"
        class="remove-item"
        @click.stop="removeNode(index)"
      >
        <VIcon>clear</VIcon>
      </VBtn>
    </VListTileAction>
  </VListTile>

</template>

<script>

  import { mapActions, mapGetters, mapMutations, mapState } from 'vuex';
  import { modes } from '../constants';
  import ContentNodeIcon from 'edit_channel/sharedComponents/ContentNodeIcon.vue';
  import { fileSizeMixin, fileStatusMixin } from 'edit_channel/file_upload/mixins';
  import FileStatus from 'edit_channel/file_upload/views/FileStatus.vue';

  export default {
    name: 'EditListItem',
    components: {
      ContentNodeIcon,
      FileStatus,
    },
    mixins: [fileSizeMixin, fileStatusMixin],
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

        return (
          !this.invalidNodes({ ignoreNewNodes: true }).includes(this.index) && !this.firstFileError
        );
      },
      backgroundColor() {
        if (this.selectedIndices.length > 1 && this.isSelected) {
          return this.$vuetify.theme.primaryBackground;
        } else if (this.isSelected) {
          return this.$vuetify.theme.greyBackground;
        }
        return 'transparent';
      },
      fileIDs() {
        return _.pluck(this.node.files, 'id');
      },
      subtitleText() {
        if (this.node.kind === 'exercise') {
          return this.$tr('questionCount', { count: this.node.assessment_items.length });
        }
        return this.statusMessage(_.pluck(this.node.files, 'id'));
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
    $trs: {
      questionCount: '{count, plural,\n =1 {# Question}\n other {# Questions}}',
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
    display: none;
  }

  /deep/ .v-list__tile {
    height: max-content !important;
    min-height: 64px;
    padding: 5px 16px;
    &:hover .remove-item {
      display: block;
    }
    .v-list__tile__content {
      padding: 0 8px;
    }
    .v-list__tile__sub-title {
      white-space: unset;
    }
  }

  .error-icon {
    font-size: 14pt !important;
  }

  .status-indicator {
    min-width: max-content;
  }

</style>
