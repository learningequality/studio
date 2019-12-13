<template>

  <div
    style="height: 100%; width: 100%; border: 2px solid transparent;"
    class="uploader"
    :style="highlightDropzone ? {
      backgroundColor: $vuetify.theme.primaryBackground,
      borderColor: $vuetify.theme.primary
    } : {borderColor:'transparent'}"
    @dragenter.prevent="enter"
    @dragover.prevent="over"
    @dragleave.prevent="leave"
    @drop.prevent="drop"
  >
    <slot name="upload-zone" :openFileDialog="openFileDialog"></slot>
    <input
      v-if="!readonly"
      ref="fileUpload"
      style="display: none;"
      type="file"
      :accept="acceptedMimetypes"
      :multiple="allowMultiple"
      @change="handleFiles($event.target.files)"
    >
  </div>

</template>

<script>

  import { mapActions, mapGetters, mapMutations } from 'vuex';
  import _ from 'underscore';
  import { getHash } from './utils';
  import Constants from 'edit_channel/constants';
  import { fileErrors, MAX_FILE_SIZE } from 'edit_channel/file_upload/constants';
  import { fileSizeMixin } from 'edit_channel/file_upload/mixins';

  export default {
    name: 'Uploader',
    mixins: [fileSizeMixin],
    props: {
      // value: {
      //   type: Object,
      //   default() {
      //     return {};
      //   },
      // },
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
        default: true,
      },
      allowDrop: {
        type: Boolean,
        default: true,
      },
    },
    data() {
      return {
        highlight: false,
      };
    },
    computed: {
      ...mapGetters('fileUploads', ['getFile']),
      acceptedFiles() {
        let filter = { supplementary: false, display: true };
        if (this.presetID) {
          filter.id = this.presetID;
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
          .value();
      },
      // file() {
      //   if (this.files.length && this.files[0].previewSrc) {
      //     return this.files[0].previewSrc;
      //   }
      //   return this.value.thumbnail_url;
      // },
      highlightDropzone() {
        return this.highlight && !this.readonly && this.allowDrop;
      },
    },
    methods: {
      // Add in once global store is properly set up
      ...mapActions('fileUploads', ['getUploadURL', 'uploadFile']),
      ...mapMutations('fileUploads', {
        addFile: 'ADD_FILE',
        setFileChecksum: 'SET_FILE_CHECKSUM',
        setFileError: 'SET_FILE_ERROR',
        setPreviewSrc: 'SET_FILE_PREVIEW_SOURCE',
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
        this.$refs.fileUpload.click();
      },
      setError(fileID, errorType) {
        let message;
        switch (errorType) {
          case fileErrors.TOO_LARGE:
            message = this.$tr(fileErrors.TOO_LARGE, { size: this.formatFileSize(MAX_FILE_SIZE) });
            break;
          case fileErrors.WRONG_TYPE:
            message = this.$tr(fileErrors.WRONG_TYPE, {
              filetypes: this.acceptedExtensions.join(', '),
            });
            break;
          case fileErrors.NO_STORAGE:
            message = this.$tr(fileErrors.NO_STORAGE);
            break;
          default:
            message = this.$tr(fileErrors.UPLOAD_FAILED);
        }
        this.setFileError({ id: fileID, error: errorType, message: message });
      },
      handleFiles(files) {
        if (!this.readonly) {
          let newFiles = [];
          files = this.allowMultiple ? files : [files[0]];

          [...files].forEach(uploadedFile => {
            let fileID = String(Math.random()).slice(2);
            this.addFile({ id: fileID, file: uploadedFile, preset: this.presetID });
            let file = this.getFile(fileID);
            newFiles.push(file);

            /* Validation for max file size and wrong file type*/
            if (file.file_size > MAX_FILE_SIZE) {
              this.setError(fileID, fileErrors.TOO_LARGE);
              return;
            } else if (!this.acceptedExtensions.includes(file.file_format)) {
              this.setError(fileID, fileErrors.WRONG_TYPE);
              return;
            }

            // 1. Get the checksum of the file
            getHash(uploadedFile).then(hash => {
              this.setFileChecksum({ id: fileID, checksum: hash });

              // 2. Get the upload url
              this.getUploadURL({ checksum: hash, size: uploadedFile.size, id: fileID })
                .then(response => {
                  // 3. Upload file
                  this.uploadFile({ id: fileID, file: uploadedFile, url: response.data }).then(
                    filepath => {
                      this.$emit('uploaded', filepath.data);
                    }
                  );
                })
                .catch(error => {
                  this.setError(fileID, error);
                });
            });

            const reader = new FileReader();
            reader.readAsDataURL(uploadedFile);
            reader.onloadend = () => {
              this.setPreviewSrc({ id: fileID, previewSrc: reader.result });
            };
          });
          this.$emit('uploading', newFiles);
        }
      },
    },
    $trs: {
      [fileErrors.NO_STORAGE]: 'Out of storage',
      [fileErrors.WRONG_TYPE]: 'Invalid file type (must be {filetypes})',
      [fileErrors.TOO_LARGE]: 'File too large. Must be under {size}',
      [fileErrors.UPLOAD_FAILED]: 'Upload failed',
    },
  };

</script>
