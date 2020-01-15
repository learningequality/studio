<template>

  <div style="width: 100%;">
    <VCard v-if="!primaryFileMapping.length" color="grey lighten-4" flat>
      <VCardText>
        <VLayout align-center justify-center fill-height>
          <VIcon color="red" class="notranslate">
            error
          </VIcon>
          &nbsp; {{ $tr('fileError') }}
        </VLayout>
      </VCardText>
    </VCard>
    <VLayout v-else row wrap>
      <VFlex sm12 md6 lg5 xl4>
        <p>
          <ContentNodeIcon :kind="node.kind" includeText />
        </p>
        <div class="preview-wrapper">
          <FilePreview :file="currentPreview" :nodeTitle="node.title" />
        </div>
      </VFlex>
      <VFlex sm12 md6 lg7 xl8>
        <VContainer fluid>
          <VLayout alignStart>
            <VRadioGroup
              :value="currentPreview && currentPreview.id"
              :label="$tr('filesHeader')"
              @input="selectPreview"
            >
              <VList threeLine>
                <FileUploadItem
                  v-for="item in primaryFileMapping"
                  v-show="!viewOnly || item.file"
                  :key="item.preset.id"
                  :viewOnly="viewOnly"
                  :file="item.file"
                  :preset="item.preset"
                  :allowFileRemove="allowFileRemove"
                  :isSelected="isSelected(item)"
                  @selected="selectPreview(item.file.id)"
                  @uploading="handleUploading"
                  @remove="handleRemoveFile"
                />
              </VList>
            </VRadioGroup>
          </VLayout>
        </VContainer>
      </VFlex>
    </VLayout>
  </div>

</template>

<script>

  import _ from 'underscore';
  import { mapGetters, mapMutations } from 'vuex';
  import FilePreview from './FilePreview.vue';
  import FileUploadItem from './FileUploadItem.vue';
  import Constants from 'edit_channel/constants';
  import ContentNodeIcon from 'edit_channel/sharedComponents/ContentNodeIcon.vue';

  export default {
    name: 'FileUpload',
    components: {
      FilePreview,
      FileUploadItem,
      ContentNodeIcon,
    },
    props: {
      nodeIndex: {
        type: Number,
      },
      viewOnly: {
        type: Boolean,
        default: true,
      },
    },
    data() {
      return {
        selected: null,
      };
    },
    computed: {
      ...mapGetters('edit_modal', ['getNode']),
      node() {
        return this.getNode(this.nodeIndex);
      },
      presets() {
        return _.filter(Constants.FormatPresets, { kind_id: this.node.kind });
      },
      fileCount() {
        return _.filter(this.node.files, file => !file.preset.supplementary && !file.error).length;
      },
      allowFileRemove() {
        return this.fileCount > 1;
      },
      currentPreview() {
        return _.findWhere(this.node.files, { id: this.selected });
      },
      primaryFileMapping() {
        return _.chain(this.presets)
          .where({ supplementary: false })
          .map(preset => {
            return {
              preset: preset,
              file: _.find(this.node.files, file => file.preset.id === preset.id),
            };
          })
          .value();
      },
    },
    mounted() {
      this.selectFirstFile();
    },
    methods: {
      ...mapMutations('edit_modal', {
        addFileToNode: 'ADD_FILE_TO_NODE',
        removeFileFromNode: 'REMOVE_FILE_FROM_NODE',
      }),
      selectFirstFile() {
        let firstFile = _.find(this.primaryFileMapping, p => p.file);
        this.selectPreview(firstFile && firstFile.file.id);
      },
      selectPreview(fileID) {
        this.selected = fileID;
      },
      handleUploading(file) {
        this.addFileToNode({ index: this.nodeIndex, file: file });
        this.selectPreview(file.id);
      },
      handleRemoveFile(fileID) {
        this.removeFileFromNode({ index: this.nodeIndex, fileID: fileID });
        if (fileID === this.selected) {
          this.selectFirstFile();
        }
      },
      isSelected(item) {
        return this.viewOnly
          ? this.fileCount > 1
          : !!item.file && this.currentPreview && this.currentPreview.id === item.file.id;
      },
    },
    $trs: {
      filesHeader: 'Preview Files',
      fileError: 'Invalid file type found',
    },
  };

</script>

<style lang="less" scoped>

  @import '../../../../less/global-variables.less';
  .preview-wrapper {
    padding-right: 15px;
  }

  .v-input--radio-group {
    width: 100%;
    /deep/ .v-input__control {
      width: 100%;
    }
    .v-list {
      padding: 0;
    }
  }

</style>
