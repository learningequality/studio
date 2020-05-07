<template>

  <!-- Wait for node to load before listing -->
  <VListTile
    v-if="node"
    :style="{backgroundColor}"
    class="py-0 px-1"
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
    <VListTileContent class="py-0 px-2">
      <VListTileTitle class="notranslate">
        {{ node.title }}
      </VListTileTitle>
      <VListTileSubTitle v-if="subtitleText">
        {{ subtitleText }}
      </VListTileSubTitle>
    </VListTileContent>
    <VSpacer />
    <VListTileAction class="status-indicator mr-1">
      <div>
        <div v-if="!uploadingFiles.length">
          <Icon v-if="!nodeIsValid" color="red" class="error-icon">
            error
          </Icon>
        </div>
        <VTooltip v-else-if="erroredFiles.length" top>
          <template v-slot:activator="{ on }">
            <Icon color="red" :large="large" v-on="on">
              error
            </Icon>
          </template>
          <span>{{ errorMessage(erroredFiles[0].checksum) }}</span>
        </VTooltip>
        <Icon
          v-else-if="progress >= 1"
          :large="large"
          color="greenSuccess"
          data-test="done"
        >
          check_circle
        </Icon>
        <VProgressCircular
          v-else
          :size="large? 60 : 20"
          :width="large? 8: 4"
          :value="progress * 100"
          color="greenSuccess"
          rotate="270"
          data-test="progress"
        />
      </div>
    </VListTileAction>
    <VListTileAction v-if="canRemove">
      <VBtn icon flat class="remove-item" @click.stop="removeNode">
        <Icon>clear</Icon>
      </VBtn>
    </VListTileAction>

  </VListTile>

</template>

<script>

  import { mapActions, mapGetters } from 'vuex';
  import { fileSizeMixin, fileStatusMixin } from 'shared/mixins';
  import ContentNodeIcon from 'shared/views/ContentNodeIcon';
  import { RouterNames } from 'frontend/channelEdit/constants';

  export default {
    name: 'EditListItem',
    components: {
      ContentNodeIcon,
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
    },
    computed: {
      ...mapGetters('currentChannel', ['canEdit']),
      ...mapGetters('contentNode', ['getContentNode', 'getContentNodeIsValid']),
      ...mapGetters('file', ['getContentNodeFiles']),
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
      files() {
        return this.getContentNodeFiles(this.nodeId);
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
        return this.statusMessage(this.node.files);
      },
      canRemove() {
        return (
          this.canEdit &&
          (this.$route.name === RouterNames.ADD_TOPICS ||
            this.$route.name === RouterNames.UPLOAD_FILES ||
            this.$route.name === RouterNames.ADD_EXERCISE)
        );
      },
      uploadingFiles() {
        return this.files.filter(f => f.uploading || f.progress);
      },
      erroredFiles() {
        return this.files.filter(f => f.error);
      },
      progress() {
        return (
          this.uploadingFiles.reduce((sum, f) => f.progress + sum, 0) / this.uploadingFiles.length
        );
      },
    },
    methods: {
      ...mapActions('contentNode', ['deleteContentNode']),
      removeNode() {
        this.deleteContentNode(this.nodeId).then(() => {
          this.$emit('removed', this.nodeId);
        });
      },
    },
    $trs: {
      questionCount: '{count, plural,\n =1 {# Question}\n other {# Questions}}',
    },
  };

</script>

<style lang="less" scoped>

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
    &:hover .remove-item {
      display: block;
    }
    .v-list__tile__sub-title {
      white-space: unset;
    }
  }

  .status-indicator {
    min-width: max-content;
  }

</style>
