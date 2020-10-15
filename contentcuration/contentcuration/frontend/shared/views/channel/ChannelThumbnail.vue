<template>

  <div :style="{width: width + 'px'}">
    <Uploader
      presetID="channel_thumbnail"
      :readonly="readonly"
      @uploading="handleUploading"
    >
      <template #default="{openFileDialog, handleFiles}">
        <!-- Thumbnail area -->
        <div class="my-1 image-wrapper">
          <div v-if="uploading || hasError" style="border: 4px solid transparent;">
            <VCard
              ref="thumbnail"
              class="thumbnail"
              data-test="loading"
            >
              <VLayout wrap align-center justify-center style="max-height: 0px;">
                <div class="text-xs-center" style="position: absolute;">
                  <p>
                    <FileStatus :checksum="uploadingChecksum" large data-test="progress" />
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
            :width="width"
            :height="height"
            :show-remove-button="false"
            :initial-image="value.thumbnail_url"
            initial-size="contain"
            :style="{borderColor: $vuetify.theme.darkGrey}"
            @new-image-drawn="cropperLoaded"
          />

          <FileDropzone
            v-else
            :disabled="readonly"
            @dropped="handleFiles"
            @click="openFileDialog"
          >
            <Thumbnail
              :src="value.thumbnail_url"
              :encoding="value.thumbnail_encoding"
            />
          </FileDropzone>
        </div>

        <!-- Toolbar -->
        <VLayout v-if="!readonly && !uploading" align-center row data-test="toolbar">
          <!-- Upload failed-->
          <template v-if="hasError">
            <span class="red--text body-1">
              <FileStatusText
                :checksum="uploadingChecksum"
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
            <ActionLink :text="$tr('save')" data-test="save" @click="save" />
          </template>

          <!-- Default options -->
          <template v-else>
            <IconButton
              icon="image"
              :text="$tr('upload')"
              @click="openFileDialog"
            />
            <IconButton
              v-if="thumbnailSrc"
              icon="crop"
              :text="$tr('crop')"
              @click="cropping = true"
            />
            <VSpacer />
            <IconButton
              v-if="thumbnailSrc"
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
  import { ASPECT_RATIO } from 'shared/constants';

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
      width: {
        type: Number,
        default: 250,
      },
    },
    data() {
      return {
        cropping: false,
        lastThumbnail: null,
        Cropper: {},
        zoomInterval: null,
        uploadingChecksum: null,
      };
    },
    computed: {
      ...mapGetters('file', ['getFileUpload']),
      file() {
        return this.getFileUpload(this.uploadingChecksum);
      },
      hasError() {
        return this.file && this.file.error;
      },
      uploading() {
        return this.uploadingChecksum && this.file.uploading;
      },
      height() {
        return this.width / ASPECT_RATIO;
      },
      thumbnailSrc() {
        let encoding = this.value.thumbnail_encoding;
        return (encoding && encoding.base64) || this.value.thumbnail_url;
      },
    },
    watch: {
      uploading(uploading) {
        if (!uploading && this.uploadingChecksum) {
          this.updateThumbnail({
            thumbnail: `${this.file.checksum}.${this.file.file_format}`,
            thumbnail_url: this.file.url,
            thumbnail_encoding: {},
          });
        }
      },
    },
    mounted() {
      this.lastThumbnail = { ...this.value };
    },
    methods: {
      updateThumbnail(data) {
        const thumbnailData = Object.assign({ ...this.value }, { ...data });
        this.$emit('input', thumbnailData);
      },
      handleUploading(fileUpload) {
        if (fileUpload.checksum) {
          this.uploadingChecksum = fileUpload.checksum;
          this.cropping = true;
        }
      },
      cancelPendingFile() {
        this.updateThumbnail(this.lastThumbnail);
        this.reset();
      },

      /* CROPPING FUNCTION */
      cropperLoaded() {
        this.Cropper.applyMetadata(this.value.thumbnail_encoding);
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
        this.uploadingChecksum = null;
      },
      remove() {
        this.updateThumbnail(DEFAULT_THUMBNAIL);
      },
      save() {
        let thumbnail_encoding = {
          ...this.Cropper.getMetadata(),
          base64: this.Cropper.generateDataUrl(),
        };
        this.updateThumbnail({ thumbnail_encoding });
        this.lastThumbnail = {
          ...this.value,
          thumbnail_encoding,
        };
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
    },
  };

</script>

<style lang="less" scoped>

  /deep/ canvas {
    border: 2px solid var(--v-grey-darken2);
  }

  .thumbnail {
    padding: 28% 0;
    border-color: var(--v-greyBorder-base) !important;
    border-style: solid;
    border-width: 1px;
    box-shadow: none;
  }

  .image-wrapper {
    padding: 1px;
  }

</style>
