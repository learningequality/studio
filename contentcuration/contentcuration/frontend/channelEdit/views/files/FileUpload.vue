<template>

  <div style="width: 100%">
    <VCard
      v-if="!primaryFileCount"
      data-test="error"
      flat
    >
      <VCardText>
        <VLayout
          align-center
          justify-center
          fill-height
        >
          <Icon icon="error" />
          &nbsp; {{ $tr('fileError') }}
        </VLayout>
      </VCardText>
    </VCard>
    <VLayout
      v-else
      row
      wrap
    >
      <VFlex
        sm12
        md12
        lg12
        xl12
      >
        <p>
          <ContentNodeIcon
            :kind="node.kind"
            includeText
          />
        </p>
      </VFlex>
      <VFlex
        sm12
        md6
        lg7
        xl7
        class="pr-4"
      >
        <h3>
          {{ $tr('filesHeader') }}
        </h3>
        <VList threeLine>
          <FileUploadItem
            v-for="item in primaryFileMapping"
            :key="item.preset.id"
            :file="item.file"
            :preset="item.preset"
            :allowFileRemove="allowFileRemove"
            :uploadCompleteHandler="handleUploadComplete"
            @selected="selected = item.file.id"
            @remove="showRemoveFileWarning = primaryFileCount > 1"
          />
        </VList>
      </VFlex>
      <VFlex
        sm12
        md6
        lg5
        xl5
      >
        <h3
          v-if="selectedFilename"
          class="mb-3"
        >
          {{ selectedFilename }}
        </h3>
        <div class="preview-wrapper">
          <VCard
            v-if="!primaryFileCount"
            flat
            class="mb-2 message-card"
          >
            <VLayout
              align-center
              justify-center
              fill-height
            >
              <VTooltip
                bottom
                lazy
              >
                <template #activator="{ on }">
                  <VIconWrapper
                    color="red"
                    v-on="on"
                  >
                    error
                  </VIconWrapper>
                </template>
                <span>{{ $tr('noFileText') }}</span>
              </VTooltip>
            </VLayout>
          </VCard>
          <FilePreview
            v-else
            :fileId="selected"
            :nodeId="nodeId"
            @click="$emit('previewClick')"
          />
        </div>
      </VFlex>
    </VLayout>

    <KModal
      v-if="showRemoveFileWarning"
      data-test="remove-file-warning"
      :title="$tr('removeFile')"
      :submitText="$tr('yesButton')"
      :cancelText="$tr('cancelButton')"
      @submit="handleRemoveFile"
      @cancel="showRemoveFileWarning = false"
    >
      <p>{{ $tr('removeFileDescription', { fileTypes: allowedFileTypes }) }}</p>
    </KModal>
  </div>

</template>


<script>

  import sortBy from 'lodash/sortBy';
  import { mapActions, mapGetters } from 'vuex';
  import FilePreview from './FilePreview';
  import FileUploadItem from './FileUploadItem';
  import { FormatPresetsList } from 'shared/leUtils/FormatPresets';
  import ContentNodeIcon from 'shared/views/ContentNodeIcon';

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
    data() {
      return {
        selected: null,
        showRemoveFileWarning: false,
      };
    },
    computed: {
      ...mapGetters('file', ['getContentNodeFiles']),
      ...mapGetters('contentNode', ['getContentNode']),
      node() {
        return this.getContentNode(this.nodeId);
      },
      files() {
        return this.getContentNodeFiles(this.nodeId);
      },
      presets() {
        // Explicitly exclude any 'dependency' presets for now
        return FormatPresetsList.filter(
          p => p.kind_id === this.node.kind && !p.id.includes('dependency'),
        );
      },
      fileCount() {
        return this.primaryFileMapping.filter(item => item.file && !item.file.error).length;
      },
      allowFileRemove() {
        return this.fileCount > 1;
      },
      primaryFileCount() {
        return this.primaryFileMapping.length;
      },
      primaryFileMapping() {
        return sortBy(
          this.presets
            .map(preset => {
              const file = this.files.find(file => file.preset.id === preset.id);
              if (!preset.supplementary && file) {
                return { preset, order: preset.order, file };
              }
              return null;
            })
            .filter(item => item !== null),
          'order',
        );
      },
      selectedFilename() {
        const file = this.files.find(f => f.id === this.selected);
        return file ? file.original_filename : '';
      },
      allowedFileTypes() {
        return this.presets
          .filter(p => !p.supplementary && Array.isArray(p.allowed_formats))
          .map(p => p.allowed_formats.join(', '))
          .join(', ');
      },
    },
    watch: {
      'files.length'(newCount, oldCount) {
        if (!oldCount) {
          this.selectFirstFile();
        }
      },
    },
    mounted() {
      this.selectFirstFile();
    },
    methods: {
      ...mapActions('file', ['updateFile', 'deleteFile']),
      selectFirstFile() {
        const firstFile = sortBy(this.files, f => f.preset.order)[0];
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
      handleRemoveFile() {
        const selectedFile = this.files.find(f => f.id === this.selected);
        if (selectedFile) {
          this.deleteFile(selectedFile).then(() => {
            this.selectFirstFile();
          });
        }
        this.showRemoveFileWarning = false;
      },
    },
    $trs: {
      filesHeader: 'Files',
      fileError: 'Unsupported file type',
      noFileText: 'Missing files',
      removeFile: 'Remove file',
      removeFileDescription:
        'Once this file is removed, this resource will only be able to include a single file from the formats: { fileTypes }. Are you sure you want to continue?',
      yesButton: 'Yes',
      cancelButton: 'Cancel',
    },
  };

</script>


<style lang="scss" scoped>

  .preview-wrapper {
    padding-right: 15px;
  }

  .message-card {
    height: 200px;
    /* stylelint-disable-next-line custom-property-pattern */
    border-color: var(--v-greyBorder-base) !important;
    border-style: solid;
    border-width: 1px;

    .v-icon {
      cursor: default;
    }
  }

  .v-input--radio-group {
    width: 100%;

    ::v-deep .v-input__control {
      width: 100%;
    }

    ::v-deep label {
      color: var(--v-text-base);
    }

    .v-list {
      padding: 0;
    }
  }

</style>
