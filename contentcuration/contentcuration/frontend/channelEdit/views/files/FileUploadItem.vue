<template>

  <Uploader
    :key="`file-${file && file.id}`"
    :presetID="preset.id"
    :uploadingHandler="uploadingHandler"
    :uploadCompleteHandler="completeUpload"
  >
    <template #default="{ openFileDialog, handleFiles }">
      <FileDropzone @dropped="handleFiles">
        <VListTile
          data-test="list-item"
          v-bind="$attrs"
          @click.stop="file ? $emit('selected') : openFileDialog()"
        >
          <VListTileAction>
            <VRadio
              v-if="file"
              :key="file.id"
              :value="file.id"
              color="primary"
              data-test="radio"
            />
          </VListTileAction>
          <VListTileContent>
            <VListTileSubTitle>{{ translateConstant(preset.id) }}</VListTileSubTitle>
            <VListTileTitle>
              <span
                v-if="fileDisplay"
                class="notranslate"
                data-test="file-link"
              >
                {{ formattedFileDisplay }}
              </span>
              <ActionLink
                v-else
                data-test="upload-link"
                :text="$tr('uploadButton')"
                @click="openFileDialog"
              />
            </VListTileTitle>
            <VListTileSubTitle v-if="erroredFile || uploading" data-test="status">
              <FileStatusText
                :fileId="erroredFile ? erroredFile.id : fileDisplay.id"
                :readonly="Boolean(fileUploadId)"
                @open="openFileDialog"
              />
            </VListTileSubTitle>
            <VListTileSubTitle v-else-if="fileDisplay">
              {{ formatFileSize(fileDisplay.file_size) }}
            </VListTileSubTitle>

          </VListTileContent>
          <VSpacer />
          <VListTileAction v-if="fileDisplay">
            <Menu>
              <template #activator="{ on }">
                <IconButton
                  size="small"
                  icon="optionsHorizontal"
                  :text="$tr('optionsButton')"
                  v-on="on"
                />
              </template>
              <VList
                class="preview-files-options"
              >
                <VListTile
                  v-for="(option, index) in previewFilesOptions"
                  :key="index"
                  :data-test="option.dataTest"
                  @click="option.onClick(openFileDialog)"
                >
                  <VListTileTitle>{{ option.label }}</VListTileTitle>
                </VListTile>
              </VList>
            </Menu>
          </VListTileAction>
        </VListTile>
      </FileDropzone>
    </template>
  </Uploader>

</template>

<script>

  import { mapGetters } from 'vuex';
  import FileStatusText from 'shared/views/files/FileStatusText';
  import Uploader from 'shared/views/files/Uploader';
  import IconButton from 'shared/views/IconButton';
  import { constantsTranslationMixin, fileSizeMixin, fileStatusMixin } from 'shared/mixins';
  import FileDropzone from 'shared/views/files/FileDropzone';

  export default {
    name: 'FileUploadItem',
    components: {
      Uploader,
      FileDropzone,
      FileStatusText,
      IconButton,
    },
    mixins: [constantsTranslationMixin, fileSizeMixin, fileStatusMixin],
    props: {
      file: {
        type: Object,
        required: false,
        default: null,
      },
      preset: {
        type: Object,
        required: true,
        validator: preset => {
          return preset.id && preset.kind_id && preset.display;
        },
      },
      allowFileRemove: {
        type: Boolean,
        default: false,
      },
      uploadCompleteHandler: {
        type: Function,
        required: false,
        default: () => {},
      },
    },
    data() {
      return {
        fileUploadId: null,
      };
    },
    computed: {
      ...mapGetters('file', ['getFileUpload']),
      fileUpload() {
        return this.fileUploadId && this.getFileUpload(this.fileUploadId);
      },
      uploading() {
        return this.fileDisplay && this.fileDisplay.uploading;
      },
      fileDisplay() {
        if (
          this.fileUpload &&
          (!this.file || this.fileUpload.id !== this.file.id) &&
          !this.fileUpload.error
        ) {
          return this.fileUpload;
        }
        return this.file;
      },
      formattedFileDisplay() {
        const fileName = this.fileDisplay.original_filename;
        if (fileName === 'file' || !fileName) {
          return this.$tr('unknownFile');
        }
        return fileName;
      },
      erroredFile() {
        if (this.fileUpload && this.fileUpload.error) {
          return this.fileUpload;
        }
        if (this.file && this.file.error) {
          return this.file;
        }
        return null;
      },
      previewFilesOptions() {
        const options = [
          {
            label: this.$tr('replaceFileMenuOptionLabel'),
            onClick: replaceFile => {
              replaceFile();
            },
            condition: this.fileDisplay,
            dataTest: 'replace-file',
          },
          {
            label: this.$tr('downloadMenuOptionLabel'),
            onClick: () => {
              this.downloadFile();
            },
            condition: this.fileDisplay,
            dataTest: 'download-file',
          },
          {
            label: this.$tr('removeMenuOptionLabel'),
            onClick: () => {
              this.removeFile();
            },
            condition: this.fileDisplay && this.allowFileRemove,
            dataTest: 'remove-file',
          },
        ];

        return options.filter(option => option.condition);
      },
    },
    watch: {
      'file.id': {
        handler() {
          this.fileUploadId = null;
        },
      },
    },
    methods: {
      completeUpload(fileUpload) {
        if (fileUpload.id === this.fileUploadId) {
          this.uploadCompleteHandler(fileUpload);
        }
      },
      uploadingHandler(fileUpload) {
        this.fileUploadId = fileUpload.id;
      },
      downloadFile() {
        window.open(this.fileDisplay.url, '_blank');
      },
      removeFile() {
        this.$emit('remove', this.file);
      },
    },
    $trs: {
      uploadButton: 'Select file',
      optionsButton: 'Options',
      replaceFileMenuOptionLabel: 'Replace file',
      downloadMenuOptionLabel: 'Download',
      removeMenuOptionLabel: 'Remove',
      /* eslint-disable kolibri/vue-no-unused-translations */
      removeFileButton: 'Remove',
      retryUpload: 'Retry upload',
      uploadFailed: 'Upload failed',
      unknownFile: 'Unknown filename',
      /* eslint-enable kolibri/vue-no-unused-translations */
    },
  };

</script>

<style lang="scss" scoped>

  .layout .section-header {
    padding: 0 15px;
    font-weight: bold;
    color: var(--v-darken-3);
  }

  button {
    margin: 0;
  }

  ::v-deep .v-list__tile {
    height: max-content !important;
    min-height: 64px;
    padding: 5px 16px;

    .remove-icon {
      display: none;
    }

    &:hover .remove-icon {
      display: block;
    }

    .v-list__tile__title {
      height: max-content;
    }

    .v-list__tile__sub-title {
      white-space: unset;
    }
  }

  .preview-files-options {
    /deep/ .v-list__tile {
      height: max-content !important;
      min-height: 48px;
      padding: 5px 16px;
    }
  }

</style>
