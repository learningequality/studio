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
          tabindex="0"
          @click.stop="file ? $emit('selected') : openFileDialog()"
        >
          <VListTileContent>
            <VListTileSubTitle>{{ translateConstant(preset.id) }}</VListTileSubTitle>
            <VListTileTitle class="file-display">
              <span
                v-if="fileDisplay"
                class="notranslate"
                data-test="file-name"
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
            <VListTileSubTitle
              v-if="erroredFile || uploading"
              data-test="status"
            >
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
            <KIconButton
              size="small"
              icon="optionsHorizontal"
              appearance="flat-button"
              data-test="show-file-options"
            >
              <template #menu>
                <KDropdownMenu
                  :options="previewFilesOptions"
                  data-test="file-options"
                  @select="option => option.onClick(openFileDialog)"
                />
              </template>
            </KIconButton>
          </VListTileAction>
        </VListTile>
      </FileDropzone>
    </template>
  </Uploader>

</template>


<script>

  import { mapActions, mapGetters } from 'vuex';
  import FileStatusText from 'shared/views/files/FileStatusText';
  import Uploader from 'shared/views/files/Uploader';
  import { constantsTranslationMixin, fileSizeMixin, fileStatusMixin } from 'shared/mixins';
  import FileDropzone from 'shared/views/files/FileDropzone';

  export default {
    name: 'FileUploadItem',
    components: {
      Uploader,
      FileDropzone,
      FileStatusText,
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
            value: 'REPLACE_FILE',
            onClick: replaceFile => {
              replaceFile();
            },
            condition: this.fileDisplay,
          },
          {
            label: this.$tr('downloadMenuOptionLabel'),
            value: 'DOWNLOAD_FILE',
            onClick: () => {
              this.initiateFileDownload();
            },
            condition: this.fileDisplay,
          },
          {
            label: this.$tr('removeMenuOptionLabel'),
            value: 'REMOVE_FILE',
            onClick: () => {
              this.removeFile();
            },
            condition: this.fileDisplay && this.allowFileRemove,
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
      ...mapActions('file', ['downloadFile']),
      ...mapActions(['showSnackbar']),
      completeUpload(fileUpload) {
        if (fileUpload.id === this.fileUploadId) {
          this.uploadCompleteHandler(fileUpload);
        }
      },
      uploadingHandler(fileUpload) {
        this.fileUploadId = fileUpload.id;
      },
      initiateFileDownload() {
        try {
          this.downloadFile({
            url: this.fileDisplay.url,
            fileName: this.formattedFileDisplay,
          });
        } catch (e) {
          this.showSnackbar({
            text: this.$tr('downloadFailed'),
          });
        }
      },
      removeFile() {
        this.$emit('remove', this.file);
      },
    },
    $trs: {
      uploadButton: 'Select file',
      replaceFileMenuOptionLabel: 'Replace file',
      downloadMenuOptionLabel: 'Download',
      removeMenuOptionLabel: 'Remove',
      downloadFailed: 'Failed to download file',
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

  ::v-deep .v-list__tile {
    height: max-content !important;
    min-height: 64px;
    padding: 5px 16px;

    &:focus {
      background-color: var(--v-grey-lighten5);
      outline-color: var(--v-primary-base);
    }

    .v-list__tile__title {
      height: 30px;
    }

    .v-list__tile__sub-title {
      margin-left: 1px;
      white-space: unset;
    }
  }

  .file-display {
    margin-left: 1px;

    span {
      font-size: 15px;
    }
  }

</style>
