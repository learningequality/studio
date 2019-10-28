<template>
  <div
    style="height: 100%; width: 100%; border: 2px solid transparent;"
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

  import { mapActions, mapMutations } from 'vuex';
  import _ from 'underscore';
  import { getHash } from './utils';
  import Constants from 'edit_channel/constants';
  import { fileErrors } from 'edit_channel/file_upload/constants';
  import { fileErrorMixin } from 'edit_channel/file_upload/mixins';

  export default {
    name: 'Uploader',
    $trs: {},
    mixins: [fileErrorMixin],
    props: {
      value: {
        type: Object,
        default() {
          return {};
        },
      },
      readonly: {
        type: Boolean,
        default: false,
      },
      preset: {
        type: String,
        required: false,
      },
      acceptedFiles: {
        type: Array,
        default: () => {
          return _.where(Constants.FormatPresets, { supplementary: false, display: true });
        },
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
      file() {
        if (this.files.length && this.files[0].previewSrc) {
          return this.files[0].previewSrc;
        }
        return this.value.thumbnail_url;
      },
      highlightDropzone() {
        return this.highlight && !this.readonly && this.allowDrop;
      },
    },
    methods: {
      ...mapActions('edit_modal', ['getUploadURL', 'uploadFile']),
      ...mapMutations('edit_modal', {
        setUploadProgress: 'SET_FILE_UPLOAD_PROGRESS',
        setFileChecksum: 'SET_FILE_CHECKSUM',
        setFileError: 'SET_FILE_ERROR',
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
      getMetadata(file) {
        let fileparts = file.name.split('.');
        let extension = fileparts[fileparts.length - 1].toLowerCase();
        let kind = _.filter(this.acceptedFiles, ftype => {
          return _.contains(ftype.allowed_formats, extension.toLowerCase());
        })[0].kind_id;

        let preset =
          this.preset ||
          _.findWhere(Constants.FormatPresets, {
            kind_id: kind,
            supplementary: false,
            display: true,
          });

        return {
          name: fileparts[0],
          preset: preset,
          file_size: file.size,
          original_filename: file.name,
          kind: kind,
          file_format: extension,
          file_on_disk: null,
        };
      },
      handleFiles(files) {
        if (!this.readonly) {
          let newFiles = [];
          files = this.allowMultiple ? files : [files[0]];

          [...files].forEach(uploadedFile => {
            const id = String(Math.random()).slice(2);

            const fileDetails = {
              id,
              previewSrc: null,
              progress: 0,
              error: null,
              hash: null,
              ...this.getMetadata(uploadedFile),
            };
            newFiles.push(fileDetails);

            // Catch upload too large and wrong extension errors
            if (uploadedFile.size > this.maxSize) {
              fileDetails.error = fileErrors.TOO_LARGE;
              return;
            } else if (!this.acceptedExtensions.includes(fileDetails.file_format)) {
              fileDetails.error = fileErrors.WRONG_TYPE;
              return;
            }

            // 1. Get the checksum of the file
            getHash(uploadedFile).then(hash => {
              this.setFileChecksum({ fileID: id, checksum: hash });

              // 2. Get the upload url
              this.getUploadURL({ checksum: hash, size: uploadedFile.size, id: id }).then(
                response => {
                  // 3. Upload file
                  this.uploadFile({ id: id, file: uploadedFile, url: response.data }).then(
                    filepath => {
                      this.$emit('uploaded', filepath.data);
                    }
                  );
                }
              );
            });

            const reader = new FileReader();
            reader.readAsDataURL(uploadedFile);
            reader.onloadend = () => {
              fileDetails.previewSrc = reader.result;
            };
          });
          this.$emit('uploading', newFiles);
        }
      },
    },
  };

</script>
