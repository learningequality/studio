<template>

  <!-- Wait for node to load before listing -->
  <VListTile
    v-if="node"
    :style="{backgroundColor}"
    @click.stop="selected = [nodeId]"
  >
    <VListTileAction style="min-width:min-content;" @click.stop>
      <VCheckbox
        v-model="selected"
        color="primary"
        :value="nodeId"
        hide-details
        class="ma-0"
      />
    </VListTileAction>

    <VListTileAction style="min-width:min-content;">
      <ContentNodeIcon :kind="node.kind" :showColor="false" />
    </VListTileAction>
    <VListTileContent>
      <VListTileTitle class="notranslate">
        {{ node.title }}
      </VListTileTitle>
      <VListTileSubTitle v-if="subtitleText">
        {{ subtitleText }}
      </VListTileSubTitle>
    </VListTileContent>
    <VSpacer />
    <VListTileAction class="status-indicator">
      <FileStatus :fileIDs="node.files">
        <Icon v-if="!nodeIsValid" color="red" class="error-icon">
          error
        </Icon>
      </FileStatus>
    </VListTileAction>
    <VListTileAction v-if="canEdit">
      <VBtn icon small flat class="remove-item" @click.stop="deleteContentNode(nodeId)">
        <Icon>clear</Icon>
      </VBtn>
    </VListTileAction>
  </VListTile>

</template>

<script>

  import { mapActions, mapGetters } from 'vuex';
  import { fileSizeMixin, fileStatusMixin } from 'edit_channel/file_upload/mixins';
  import FileStatus from 'frontend/channelEdit/views/files/FileStatus';
  import ContentNodeIcon from 'shared/views/ContentNodeIcon';

  export default {
    name: 'EditListItem',
    components: {
      ContentNodeIcon,
      FileStatus,
    },
    mixins: [fileSizeMixin, fileStatusMixin],
    props: {
      value: {
        type: Array,
        default: () => [],
      },
      nodeId: {
        type: String,
        required: true,
      },
      canEdit: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      ...mapGetters('contentNode', ['getContentNode', 'getContentNodeIsValid']),
      selected: {
        get() {
          return this.value;
        },
        set(value) {
          this.$emit('input', value);
        },
      },
      node() {
        return this.getContentNode(this.nodeId);
      },
      nodeIsValid() {
        return !this.canEdit || this.getContentNodeIsValid(this.nodeId);
      },
      backgroundColor() {
        if (this.selected.includes(this.nodeId)) {
          return this.selected.length > 1
            ? this.$vuetify.theme.primaryBackground
            : this.$vuetify.theme.greyBackground;
        }
        return 'transparent';
      },
      subtitleText() {
        if (this.node.kind === 'exercise') {
          return this.$tr('questionCount', { count: this.node.assessment_items.length });
        }
        return this.statusMessage(_.pluck(this.node.files, 'id'));
      },
    },
    methods: {
      ...mapActions('contentNode', ['deleteContentNode']),
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
    }
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
