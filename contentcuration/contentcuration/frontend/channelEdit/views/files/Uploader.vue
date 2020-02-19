<template>

  <div
    style="border: 4px solid transparent;"
    class="uploader"
    :style="{
      backgroundColor: highlightDropzone? $vuetify.theme.primaryBackground : 'transparent',
      borderColor: highlightDropzone? $vuetify.theme.primary : borderColor,
      width: fill? '100%' : 'unset',
      height: fill? '100%' : 'unset',
    }"
    data-test="dropzone"
    @dragenter.prevent="enter"
    @dragover.prevent="over"
    @dragleave.prevent="leave"
    @drop.prevent="drop"
  >
    <slot :openFileDialog="openFileDialog"></slot>
    <input
      v-if="!readonly"
      ref="fileUpload"
      style="display: none;"
      type="file"
      :accept="acceptedMimetypes"
      :multiple="allowMultiple"
      data-test="upload-dialog"
      @change="handleFiles($event.target.files)"
    >
    <Alert
      ref="unsupportedfiles"
      :header="$tr('unsupportedFilesHeader')"
      :text="unsupportedFilesText"
    />
    <Alert
      ref="toolargefiles"
      :header="$tr('tooLargeFilesHeader')"
      :text="$tr('maxFileSizeText', {
        count: tooLargeFiles.length, size: formatFileSize(maxFileSize)
      })"
    />
    <Alert
      ref="storageexceeded"
      :header="$tr('noStorageHeader')"
      text=""
    >
      <template v-slot>
        <div class="storage-alert">
          <p>{{ $tr('uploadSize', {size: formatFileSize(totalUploadSize)}) }}</p>
          <p>
            {{ $tr('remainingStorage', {size: formatFileSize(availableSpace)}) }}
          </p>
          <div class="storage-usage">
            <FileStorage />
          </div>
        </div>
      </template>
    </Alert>
  </div>

</template>

<script>

  import { mapActions, mapGetters, mapMutations } from 'vuex';
  import _ from 'underscore';
  import Constants from 'edit_channel/constants';
  import Alert from 'edit_channel/sharedComponents/Alert.vue';

  import { fileErrors, MAX_FILE_SIZE } from 'edit_channel/file_upload/constants';
  import { fileSizeMixin } from 'edit_channel/file_upload/mixins';
  import FileStorage from 'frontend/channelEdit/views/files/FileStorage';
  import State from 'edit_channel/state';

  export default {
    name: 'Uploader',
    components: {
      Alert,
      FileStorage,
    },
    mixins: [fileSizeMixin],
    props: {
      readonly: {
        type: Boolean,
        default: false,
      },
      presetID: {
        type: String,
        required: false,
      },
      allowMultiple: {
        type: Boolean,
        default: false,
      },
      allowDrop: {
        type: Boolean,
        default: true,
      },
      borderColor: {
        type: String,
        default: 'transparent',
      },
      fill: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        highlight: false,
        unsupportedFiles: [],
        tooLargeFiles: [],
        totalUploadSize: 0,
      };
    },
    computed: {
      ...mapGetters('file', ['getFile']),
      acceptedFiles() {
        let filter = { display: true };
        if (this.presetID) {
          filter.id = this.presetID;
        } else {
          filter.supplementary = false;
        }
        return _.where(Constants.FormatPresets, filter);
      },
      acceptedMimetypes() {
        return _.chain(this.acceptedFiles)
          .pluck('associated_mimetypes')
          .flatten()
          .value()
          .join(',');
      },
      acceptedExtensions() {
        return _.chain(this.acceptedFiles)
          .pluck('allowed_formats')
          .flatten()
          .uniq()
          .value();
      },
      unsupportedFilesText() {
        return this.$tr('unsupportedFilesText', {
          count: this.unsupportedFiles.length,
          extensions: this.acceptedExtensions.join(this.$tr('listDelimiter')),
          extensionCount: this.acceptedExtensions.length,
        });
      },
      availableSpace() {
        return State.current_user.get('available_space');
      },
      highlightDropzone() {
        return this.highlight && !this.readonly && this.allowDrop;
      },
      maxFileSize() {
        return MAX_FILE_SIZE;
      },
    },
    methods: {
      // Add in once global store is properly set up
      ...mapActions('file', ['uploadFile']),
      ...mapMutations('file', {
        addFile: 'CREATE_FILE',
        setFileError: 'UPDATE_FILE',
      }),
      enter() {
        this.highlight = true;
      },
      over() {
        this.highlight = true;
      },
      leave() {
        this.highlight = false;
      },
      drop(e) {
        this.highlight = false;
        if (this.allowDrop) this.handleFiles(e.dataTransfer.files);
      },
      openFileDialog() {
        if (!this.readonly) {
          this.$refs.fileUpload.click();
        }
      },
      setError(id, type) {
        let message = this.$tr('uploadFailedError');
        if (type === fileErrors.TOO_LARGE) {
          message = this.$tr('tooLargeError', { size: this.formatFileSize(MAX_FILE_SIZE) });
        } else if (type === fileErrors.WRONG_TYPE) {
          message = this.$tr('wrongTypeError', { filetypes: this.acceptedExtensions.join(', ') });
        } else if (type === fileErrors.NO_STORAGE) {
          message = this.$tr('noStorageError');
        } else {
          type = fileErrors.UPLOAD_FAILED;
        }
        this.setFileError({ id, error: { type, message } });
      },
      validateFiles(files) {
        // Get unsupported file types
        let partition = _.partition(files, f =>
          this.acceptedExtensions.includes(_.last(f.name.split('.')).toLowerCase())
        );
        files = partition[0];
        this.unsupportedFiles = partition[1];

        // Get files that exceed the max file size
        partition = _.partition(files, f => f.size < MAX_FILE_SIZE);
        files = partition[0];
        this.tooLargeFiles = partition[1];

        // Get the total file size
        this.totalUploadSize = _.reduce(files, (sum, f) => sum + f.size, 0);
        return files;
      },
      handleFiles(files) {
        if (!this.readonly) {
          files = this.allowMultiple ? files : [files[0]];
          files = this.validateFiles(files);

          // Show errors if relevant
          if (this.totalUploadSize > this.availableSpace) {
            this.$refs.storageexceeded.prompt();
            return;
          } else if (this.unsupportedFiles.length) {
            this.$refs.unsupportedfiles.prompt();
          } else if (this.tooLargeFiles.length) {
            this.$refs.toolargefiles.prompt();
          }
          this.handleUploads(files).then(newFiles => {
            if (newFiles.length) {
              this.$emit('uploading', newFiles);
            }
          });
        }
      },
      handleUploads(files) {
        return new Promise(resolve => {
          let newFiles = [];
          [...files].forEach(uploadedFile => {
            let fileID = String(Math.random()).slice(2);
            this.addFile({ id: fileID, file: uploadedFile, preset: this.presetID });
            let file = this.getFile(fileID);
            newFiles.push(file);

            this.uploadFile({ file: uploadedFile, id: fileID })
              .then(filepath => {
                this.$emit('uploaded', filepath);
              })
              .catch(error => {
                this.setError(fileID, error);
              });
          });

          resolve(newFiles);
        });
      },
    },
    $trs: {
      noStorageError: 'Out of storage',
      wrongTypeError: 'Invalid file type (must be {filetypes})',
      tooLargeError: 'File too large. Must be under {size}',
      uploadFailedError: 'Upload failed',
      unsupportedFilesHeader: 'Unsupported files',
      unsupportedFilesText:
        '{count, plural,\n =1 {File}\n other {# files}} will not be uploaded.\n' +
        ' {extensionCount, plural,\n =1 {Accepted file type is}\n other {Accepted file types are}} {extensions}',
      listDelimiter: ', ',
      noStorageHeader: 'Not enough space',
      uploadSize: 'Upload is too large: {size}',
      remainingStorage: 'Remaining storage: {size}',
      tooLargeFilesHeader: 'Max file size exceeded',
      maxFileSizeText:
        '{count, plural,\n =1 {File}\n other {# files}} will not be uploaded. File size must be under {size}',
    },
  };

</script>

<style lang="less" scoped>

  .storage-alert {
    font-size: 12pt;
  }
  .storage-usage {
    margin-top: -5px;
    font-size: 10pt;
    color: gray;
  }

</style>
