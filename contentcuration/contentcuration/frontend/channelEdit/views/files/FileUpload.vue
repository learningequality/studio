<template>

  <div style="width: 100%;">
    <VCard
      v-if="!primaryFileMapping.length"
      data-test="error"
      flat
    >
      <VCardText>
        <VLayout align-center justify-center fill-height>
          <Icon color="red">
            error
          </Icon>
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
          <VCard v-if="!primaryFileCount" flat class="mb-2 message-card">
            <VLayout align-center justify-center fill-height>
              <VTooltip bottom>
                <template #activator="{ on }">
                  <Icon color="red" v-on="on">
                    error
                  </Icon>
                </template>
                <span>{{ $tr('noFileText') }}</span>
              </VTooltip>
            </VLayout>
          </VCard>
          <FilePreview
            v-else
            :node="node"
            :nodeFiles="contentNodeFiles"
            :fileId="selected"
            @click="$emit('previewClick')"
          />
        </div>
      </VFlex>
      <VFlex sm12 md6 lg7 xl8>
        <VContainer fluid>
          <VLayout alignStart>
            <VRadioGroup
              v-model="selected"
              hide-details
              :label="$tr('filesHeader')"
              class="subheading"
            >
              <VList threeLine>
                <FileUploadItem
                  v-for="item in primaryFileMapping"
                  :key="item.preset.id"
                  :file="item.file"
                  :preset="item.preset"
                  :allowFileRemove="allowFileRemove"
                  :uploadCompleteHandler="handleUploadComplete"
                  @selected="selected = item.file.id"
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

  import { onMounted } from '@vue/composition-api';
  import sortBy from 'lodash/sortBy';
  import { mapGetters } from 'vuex';
  import FilePreview from './FilePreview';
  import FileUploadItem from './FileUploadItem';
  import useContentNodesFiles from 'shared/composables/useContentNodesFiles';
  import useFiles from 'shared/composables/useFiles';
  import { FormatPresetsList } from 'shared/leUtils/FormatPresets';
  import ContentNodeIcon from 'shared/views/ContentNodeIcon';
  import { File } from 'shared/data/resources';

  export default {
    name: 'FileUpload',
    components: {
      FilePreview,
      FileUploadItem,
      ContentNodeIcon,
    },
    props: {
      nodeId: {
        type: String,
        required: true,
      },
    },
    setup(props) {
      const {
        subscribeContentNodesFiles,
        contentNodesFiles,
        primaryContentNodesFiles,
      } = useContentNodesFiles();
      const { updateFile } = useFiles();
      onMounted(() => {
        subscribeContentNodesFiles([props.nodeId]);
      });

      return {
        contentNodeFiles: contentNodesFiles,
        primaryContentNodeFiles: primaryContentNodesFiles,
        updateFile,
      };
    },
    data() {
      return {
        selected: null,
      };
    },
    computed: {
      ...mapGetters('contentNode', ['getContentNode']),
      node() {
        return this.getContentNode(this.nodeId);
      },
      presets() {
        return FormatPresetsList.filter(p => p.kind_id === this.node.kind);
      },
      fileCount() {
        return this.primaryFileMapping.filter(item => item.file && !item.file.error).length;
      },
      allowFileRemove() {
        return this.fileCount > 1;
      },
      primaryFileCount() {
        return this.primaryContentNodeFiles.length;
      },
      primaryFileMapping() {
        return sortBy(
          this.presets
            .filter(p => !p.supplementary)
            .map(preset => {
              return {
                preset,
                order: preset.order,
                file: this.contentNodeFiles.find(file => file.preset.id === preset.id),
              };
            }),
          'order'
        );
      },
    },
    watch: {
      'contentNodeFiles.length'(newCount, oldCount) {
        if (!oldCount) {
          this.selectFirstFile();
        }
      },
    },
    mounted() {
      this.selectFirstFile();
    },
    methods: {
      selectFirstFile() {
        let firstFile = sortBy(this.contentNodeFiles, f => f.preset.order)[0];
        this.selected = firstFile && firstFile.id;
      },
      handleUploadComplete(fileUpload) {
        this.updateFile({
          ...fileUpload,
          contentnode: this.nodeId,
        }).then(() => {
          this.selected = fileUpload.id;
        });

        this.$analytics.trackAction('file_uploader', 'Upload', {
          eventLabel: 'Related file',
        });
      },
      handleRemoveFile(file) {
        if (!file) {
          return;
        }
        File.delete(file.id);
        if (file.id === this.selected) {
          this.selectFirstFile();
        }
      },
    },
    $trs: {
      filesHeader: 'Preview files',
      fileError: 'Unsupported file type',
      noFileText: 'Missing files',
    },
  };

</script>

<style lang="less" scoped>

  .preview-wrapper {
    padding-right: 15px;
  }

  .message-card {
    height: 200px;
    border-color: var(--v-greyBorder-base) !important;
    border-style: solid;
    border-width: 1px;
    .v-icon {
      cursor: default;
    }
  }

  .v-input--radio-group {
    width: 100%;
    /deep/ .v-input__control {
      width: 100%;
    }
    /deep/ label {
      color: var(--v-text-base);
    }
    .v-list {
      padding: 0;
    }
  }

</style>
