<template>

  <Uploader
    :key="file.id"
    :presetID="presetID"
    :readonly="readonly"
    :uploadCompleteHandler="uploadCompleteHandler"
    :uploadingHandler="uploadingHandler"
  >
    <template #default="{ openFileDialog }">
      <VListTile @click="!readonly && !fileDisplay.uploading && openFileDialog()">
        <VListTileContent>
          <VListTileTitle>
            <span v-if="readonly || fileDisplay.uploading" class="notranslate">
              {{ fileDisplay.original_filename }}
            </span>
            <ActionLink
              v-else
              data-test="upload-file"
              :text="fileDisplay.original_filename"
              class="notranslate"
              @click="openFileDialog"
            />
            <FileStatusText
              v-if="erroredFile"
              :fileId="erroredFile"
              :readonly="Boolean(fileUploadId)"
              data-test="error"
              @open="openFileDialog"
            />
          </VListTileTitle>
          <VListTileSubTitle v-if="fileDisplay.language">
            {{ $tr('languageText', {
              language: fileDisplay.language.native_name, code: fileDisplay.language.id }) }}
          </VListTileSubTitle>
        </VListTileContent>
        <VListTileContent>
          <VListTileTitle class="grey--text text-xs-right">
            <span v-if="fileDisplay.uploading" data-test="uploading">
              <FileStatusText :file="fileDisplay" @open="openFileDialog" />
            </span>
            <span v-else-if="!fileDisplay.error">
              {{ formatFileSize(fileDisplay.file_size) }}
            </span>
          </VListTileTitle>
        </VListTileContent>
        <VListTileAction v-if="!readonly">
          <VBtn icon flat data-test="remove" @click.stop="$emit('remove', file.id)">
            <Icon>
              clear
            </Icon>
          </VBtn>
        </VListTileAction>
      </VListTile>
    </template>
  </Uploader>

</template>

<script>

  import useFiles from 'shared/composables/useFiles';
  import useFileUpload from 'shared/composables/useFileUpload';
  import FileStatusText from 'shared/views/files/FileStatusText';
  import Uploader from 'shared/views/files/Uploader';

  export default {
    name: 'SupplementaryItem',
    components: {
      Uploader,
      FileStatusText,
    },
    props: {
      file: {
        type: Object,
        required: true,
      },
      presetID: {
        type: String,
        required: true,
      },
      readonly: {
        type: Boolean,
        default: false,
      },
      uploadCompleteHandler: {
        type: Function,
        required: false,
      },
    },
    setup() {
      const { formatFileSize } = useFiles();
      const { getFileUpload } = useFileUpload();
      return { formatFileSize, getFileUpload };
    },
    data() {
      return {
        fileUploadId: null,
      };
    },
    computed: {
      fileUpload() {
        return this.getFileUpload(this.fileUploadId);
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
      erroredFile() {
        if (this.fileUpload && this.fileUpload.error) {
          return this.fileUpload;
        }
        if (this.file && this.file.error) {
          return this.file;
        }
        return null;
      },
    },
    methods: {
      uploadingHandler(fileUpload) {
        this.fileUploadId = fileUpload.id;
      },
    },
    $trs: {
      languageText: '{language} ({code})',
      /* eslint-disable kolibri/vue-no-unused-translations */
      retryUpload: 'Retry upload',
      uploadFailed: 'Upload failed',
      /* eslint-enable kolibri/vue-no-unused-translations */
    },
  };

</script>

<style lang="less" scoped>

  .v-icon {
    font-size: 14pt;
    vertical-align: middle;
  }

</style>
