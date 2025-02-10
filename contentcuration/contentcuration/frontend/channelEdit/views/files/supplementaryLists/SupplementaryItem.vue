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
              :fileId="erroredFile.id"
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
              <FileStatusText :fileId="fileDisplay.id" @open="openFileDialog" />
            </span>
            <span v-else-if="!fileDisplay.error">
              {{ formatFileSize(fileDisplay.file_size) }}
            </span>
          </VListTileTitle>
        </VListTileContent>
        <VListTileAction v-if="!readonly">
          <VBtn icon flat data-test="remove" @click.stop="$emit('remove', file.id)">
            <Icon icon="clear" />
          </VBtn>
        </VListTileAction>
      </VListTile>
    </template>
  </Uploader>

</template>

<script>

  import { mapGetters } from 'vuex';
  import FileStatusText from 'shared/views/files/FileStatusText';
  import { fileSizeMixin } from 'shared/mixins';
  import Uploader from 'shared/views/files/Uploader';

  export default {
    name: 'SupplementaryItem',
    components: {
      Uploader,
      FileStatusText,
    },
    mixins: [fileSizeMixin],
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

<style lang="scss" scoped>

  .v-icon {
    font-size: 14pt;
    vertical-align: middle;
  }

</style>
