<template>
  <VListTile :style="{backgroundColor: backgroundColor}" @click.stop="setNode(index)">
    <VListTileAction>
      <VCheckbox color="primary" :inputValue="isSelected" @click.stop="toggleNode" />
    </VListTileAction>
    <VListTileAction v-if="node.changesStaged" class="changed">
      *
    </VListTileAction>
    <VListTileAction>
      <ContentNodeIcon :kind="node.kind" :showColor="false" />
    </VListTileAction>
    <VListTileContent>
      <VListTileTitle>
        {{ node.title }}
      </VListTileTitle>
      <VListTileSubTitle v-if="firstFileError">
        {{ firstFileError }}
      </VListTileSubTitle>
      <VListTileSubTitle v-else-if="subtitleText">
        {{ subtitleText }}
      </VListTileSubTitle>
    </VListTileContent>
    <VSpacer />
    <VListTileAction v-if="!nodeIsValid">
      <VIcon color="red" class="error-icon">
        error
      </VIcon>
    </VListTileAction>
    <VListTileAction v-else-if="showUploadComplete">
      <VIcon color="greenSuccess">
        check_circle
      </VIcon>
    </VListTileAction>
    <VListTileAction v-else-if="uploads.length && uploadProgress === 0">
      <VIcon color="grey">
        query_builder
      </VIcon>
    </VListTileAction>
    <VListTileAction v-else-if="uploads.length">
      <v-progress-circular
        slot="activator"
        size="20"
        :value="uploadProgress"
        color="greenSuccess"
        rotate="270"
      />
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
  import ContentNodeIcon from 'edit_channel/sharedComponents/ContentNodeIcon.vue';
  import { fileSizeMixin, fileErrorMixin } from 'edit_channel/file_upload/mixins';

  export default {
    name: 'EditListItem',
    $trs: {
      uploadFileSize: '{uploaded} of {total}',
      questionCount: '{count, plural,\n =1 {# Question}\n other {# Questions}}',
    },
    components: {
      ContentNodeIcon,
    },
    mixins: [fileSizeMixin, fileErrorMixin],
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
        showUploadComplete: false,
      };
    },
    computed: {
      ...mapGetters('edit_modal', ['getNode', 'invalidNodes']),
      ...mapState('edit_modal', ['selectedIndices']),
      node() {
        return this.getNode(this.index);
      },
      isSelected() {
        return this.selectedIndices.includes(this.index);
      },
      nodeIsValid() {
        return !this.invalidNodes.includes(this.index) && !this.firstFileError;
      },
      uploads() {
        return _.reject(
          this.node.files,
          file => file.progress === undefined || file.progress === null
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
      uploadProgress() {
        let sum = _.reduce(
          this.uploads,
          (sum, file) => {
            return file.progress + sum;
          },
          0
        );
        return sum / this.uploads.length;
      },
      firstFileError() {
        return this.getFileErrorMessage(this.node.files);
      },
      subtitleText() {
        if (this.node.kind === 'exercise') {
          return this.$tr('questionCount', { count: this.node.assessment_items.length });
        } else if (this.node.kind !== 'topic' && this.uploads.length) {
          let uploadedSize = _.reduce(
            this.uploads,
            (sum, file) => {
              return (file.progress / 100) * file.file_size + sum;
            },
            0
          );
          return this.$tr('uploadFileSize', {
            uploaded: this.formatFileSize(uploadedSize),
            total: this.formatFileSize(this.node.metadata.resource_size),
          });
        }
        return null;
      },
    },
    watch: {
      uploadProgress(newVal) {
        if (newVal >= 100) {
          this.showUploadComplete = true;
          this.uploads.forEach(file => {
            this.setFileUploadProgress({
              fileID: file.id,
              progress: null,
            });
          });
          setTimeout(() => {
            this.showUploadComplete = false;
          }, 5000);
        }
      },
    },
    methods: {
      ...mapMutations('edit_modal', {
        select: 'SELECT_NODE',
        deselect: 'DESELECT_NODE',
        setNode: 'SET_NODE',
        setFileUploadProgress: 'SET_FILE_UPLOAD_PROGRESS',
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
    display: none;
  }

  /deep/ .v-list__tile {
    &:hover .remove-item {
      display: block;
    }
    .v-list__tile__content {
      padding-left: 8px;
    }
    .v-list__tile__sub-title {
      white-space: unset;
    }
  }

  .error-icon {
    font-size: 14pt !important;
  }

</style>
