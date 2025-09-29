<template>

  <div :style="{ width: width + 'px' }">
    <Uploader
      presetID="channel_thumbnail"
      :readonly="readonly"
      :uploadingHandler="handleUploading"
      :uploadCompleteHandler="handleUploadComplete"
    >
      <template #default="{ openFileDialog, handleFiles }">
        <!-- Thumbnail area -->
        <div class="image-wrapper my-1">
          <div
            v-if="uploading || hasError"
            style="border: 4px solid transparent"
          >
            <VCard
              ref="thumbnail"
              class="thumbnail"
              data-test="loading"
            >
              <VLayout
                wrap
                align-center
                justify-center
                style="max-height: 0"
              >
                <div
                  class="text-xs-center"
                  style="position: absolute"
                >
                  <p>
                    <FileStatus
                      :fileId="uploadingId"
                      large
                      data-test="progress"
                    />
                  </p>
                  <ActionLink
                    v-if="!hasError"
                    :text="$tr('cancel')"
                    data-test="cancel-upload"
                    @click="cancelPendingFile"
                  />
                </div>
              </VLayout>
            </VCard>
          </div>

          <croppa
            v-else-if="cropping"
            v-model="Cropper"
            data-test="cropper"
            :zoom-speed="10"
            :placeholder="$tr('upload')"
            :disable-click-to-choose="true"
            :disable-drag-and-drop="true"
            :width="width"
            :height="height"
            :show-remove-button="false"
            :initial-image="thumbnailSrc"
            initial-size="contain"
            :style="{ borderColor: $vuetify.theme.darkGrey }"
            @new-image-drawn="cropperLoaded"
          />

          <FileDropzone
            v-else
            :disabled="readonly"
            @dropped="handleFiles"
            @click="openFileDialog"
          >
            <Thumbnail
              :src="thumbnailSrc"
              :encoding="displayEncoding"
            />
          </FileDropzone>
        </div>

        <!-- Toolbar -->
        <VLayout
          v-if="!readonly && (!uploading || hasError)"
          align-center
          row
          data-test="toolbar"
        >
          <!-- Upload failed-->
          <template v-if="hasError">
            <span class="body-1 red--text">
              <FileStatusText
                :fileId="uploadingId"
                @open="openFileDialog"
              />
            </span>
            <VSpacer />
            <IconButton
              icon="clear"
              data-test="remove"
              :text="$tr('cancel')"
              @click="cancelPendingFile"
            />
          </template>

          <!-- Cropping options -->
          <template v-else-if="cropping">
            <IconButton
              icon="plus"
              data-test="zoomin"
              :text="$tr('zoomIn')"
              @click="Cropper && Cropper.zoomIn()"
              @mousedown="cropZoomIn"
              @mouseup="cropZoomStop"
            />
            <IconButton
              icon="minus"
              data-test="zoomout"
              :text="$tr('zoomOut')"
              @click="Cropper && Cropper.zoomOut()"
              @mousedown="cropZoomOut"
              @mouseup="cropZoomStop"
            />
            <VSpacer />
            <ActionLink
              class="mr-3"
              data-test="cancel"
              :text="$tr('cancel')"
              @click="cancelPendingFile"
            />
            <ActionLink
              :text="$tr('save')"
              data-test="save"
              @click="save"
            />
          </template>

          <!-- Default options -->
          <template v-else>
            <IconButton
              icon="image"
              :text="$tr('upload')"
              @click="openFileDialog"
            />
            <IconButton
              v-if="hasThumbnail"
              icon="crop"
              :text="$tr('crop')"
              @click="cropping = true"
            />
            <VSpacer />
            <IconButton
              v-if="hasThumbnail"
              icon="clear"
              data-test="remove"
              :text="$tr('remove')"
              @click="remove"
            />
          </template>
        </VLayout>
      </template>
    </Uploader>
  </div>

</template>


<script>

  import { mapGetters } from 'vuex';
  import IconButton from '../IconButton';
  import Uploader from 'shared/views/files/Uploader';
  import FileStatus from 'shared/views/files/FileStatus';
  import FileStatusText from 'shared/views/files/FileStatusText';
  import Thumbnail from 'shared/views/files/Thumbnail';
  import FileDropzone from 'shared/views/files/FileDropzone';
  import { ASPECT_RATIO, THUMBNAIL_WIDTH } from 'shared/constants';

  const DEFAULT_THUMBNAIL = {
    thumbnail: null,
    thumbnail_url: '',
    thumbnail_encoding: {},
  };

  export default {
    name: 'ChannelThumbnail',
    components: {
      FileDropzone,
      FileStatus,
      FileStatusText,
      IconButton,
      Thumbnail,
      Uploader,
    },
    props: {
      value: {
        type: Object,
        default() {
          return {
            ...DEFAULT_THUMBNAIL,
          };
        },
      },
      readonly: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        cropping: false,
        Cropper: {},
        zoomInterval: null,
        uploadingId: null,
        newEncoding: null,
      };
    },
    computed: {
      ...mapGetters('file', ['getFileUpload']),
      file() {
        return this.uploadingId && this.getFileUpload(this.uploadingId);
      },
      hasError() {
        return this.file && this.file.error;
      },
      uploading() {
        return this.file && this.file.uploading;
      },
      width() {
        return THUMBNAIL_WIDTH;
      },
      height() {
        return this.width / ASPECT_RATIO;
      },
      thumbnailSrc() {
        if (this.file) {
          if (this.uploading) {
            return this.file.previewSrc;
          }
          return this.file.url;
        }
        if (this.value && this.value.thumbnail_url) {
          return this.value.thumbnail_url;
        }
        return '';
      },
      displayEncoding() {
        if (this.newEncoding) {
          return this.newEncoding;
        }
        return this.value.thumbnail_encoding;
      },
      hasThumbnail() {
        return this.thumbnailSrc.length || Object.keys(this.displayEncoding || {}).length;
      },
    },
    methods: {
      updateThumbnail(data) {
        const thumbnailData = Object.assign({ ...this.value }, { ...data });
        this.$emit('input', thumbnailData);
      },
      handleUploading(fileUpload) {
        if (fileUpload.id) {
          // Set a blank encoding so that we apply
          // new croppa metadata to the new image.
          this.newEncoding = {};
          this.uploadingId = fileUpload.id;
        }
      },
      handleUploadComplete(fileUpload) {
        if (fileUpload.id === this.uploadingId) {
          this.$nextTick(() => {
            this.cropping = true;
          });
        }
      },
      cancelPendingFile() {
        if (this.fileUpload) {
          this.deleteFile(this.fileUpload);
        }
        this.reset();
      },

      /* CROPPING FUNCTION */
      cropperLoaded() {
        this.Cropper.applyMetadata(this.displayEncoding);
      },
      cropZoomIn() {
        if (!this.zoomInterval) {
          this.zoomInterval = setInterval(this.Cropper.zoomIn, 100);
        }
      },
      cropZoomOut() {
        if (!this.zoomInterval) {
          this.zoomInterval = setInterval(this.Cropper.zoomOut, 100);
        }
      },
      cropZoomStop() {
        clearInterval(this.zoomInterval);
        this.zoomInterval = null;
      },
      reset() {
        this.cropping = false;
        this.uploadingId = null;
      },
      remove() {
        this.updateThumbnail(DEFAULT_THUMBNAIL);
        this.newEncoding = null;
        this.reset();
      },
      save() {
        this.newEncoding = {
          ...this.Cropper.getMetadata(),
          base64: this.Cropper.generateDataUrl(),
        };
        if (this.file) {
          this.updateThumbnail({
            thumbnail: `${this.file.checksum}.${this.file.file_format}`,
            thumbnail_url: this.file.url,
            thumbnail_encoding: this.newEncoding,
          });
        } else {
          this.updateThumbnail({
            thumbnail_encoding: this.newEncoding,
          });
        }
        this.reset();
      },
    },
    $trs: {
      crop: 'Crop',
      upload: 'Upload image',
      remove: 'Remove',
      zoomIn: 'Zoom in',
      zoomOut: 'Zoom out',
      save: 'Save',
      cancel: 'Cancel',
      /* eslint-disable kolibri/vue-no-unused-translations */
      retryUpload: 'Retry upload',
      uploadFailed: 'Upload failed',

      // TODO: make channel thumbnail match ContentNodeThumbnail component
      noThumbnail: 'No thumbnail',
      croppingPrompt: 'Drag image to reframe',
      uploadingThumbnail: 'Uploading',
      defaultFilename: 'File',
      /* eslint-enable kolibri/vue-no-unused-translations */
    },
  };

</script>


<style lang="scss" scoped>

  ::v-deep canvas {
    border: 2px solid var(--v-grey-darken2);
  }

  .thumbnail {
    padding: 28% 0;
    /* stylelint-disable-next-line custom-property-pattern */
    border-color: var(--v-greyBorder-base) !important;
    border-style: solid;
    border-width: 1px;
    box-shadow: none;
  }

  .image-wrapper {
    padding: 1px;
  }

</style>
