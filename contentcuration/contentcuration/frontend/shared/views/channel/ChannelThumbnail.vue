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
            <FileStatusCard :fileId="uploadingId" @cancel="cancelPendingFile" />
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
            :borderColor="$vuetify.theme.greyBorder"
            :disabled="readonly"
            @dropped="handleFiles"
            @click="openFileDialog"
          >
            <Thumbnail :src="thumbnailSrc" />
          </FileDropzone>
        </div>

        <!-- Toolbar -->
        <VLayout v-if="!readonly && !uploading" align-center row data-test="toolbar">
          <!-- Upload failed-->
          <div v-if="true" class="red--text body-1">
            <FileStatusText
              :fileIds="[uploadingId]"
              @open="openFileDialog"
            />
          </div>

          <!-- Cropping options -->
          <div v-else-if="cropping">
            <IconButton
              icon="add"
              data-test="zoomin"
              :text="$tr('zoomIn')"
              @click="Cropper && Cropper.zoomIn()"
              @mousedown="cropZoomIn"
              @mouseup="cropZoomStop"
            />
            <IconButton
              icon="remove"
              data-test="zoomout"
              :text="$tr('zoomOut')"
              @click="Cropper && Cropper.zoomOut()"
              @mousedown="cropZoomOut"
              @mouseup="cropZoomStop"
            />
          </div>

          <!-- Default options -->
          <template v-else-if="!uploading">
            <IconButton
              icon="image"
              :text="$tr('upload')"
              @click="openFileDialog"
            />
            <IconButton
              v-if="!hasError && thumbnailSrc"
              icon="crop"
              :text="$tr('crop')"
              @click="cropping = true"
            />
          </template>

          <VSpacer />
          <div v-if="!uploading">
            <span v-if="!hasError && cropping">
              <ActionLink
                class="mr-3"
                data-test="cancel"
                :text="$tr('cancel')"
                @click="cancelPendingFile"
              />
              <ActionLink :text="$tr('save')" data-test="save" @click="save" />
            </span>
            <IconButton
              v-else-if="thumbnailSrc"
              icon="clear"
              data-test="remove"
              :text="$tr('remove')"
              @click="remove"
            />
          </div>
        </VLayout>
      </template>
    </Uploader>
  </div>

</template>

<script>

  import { mapGetters } from 'vuex';
  import IconButton from '../IconButton';
  import ActionLink from '../ActionLink';
  import Uploader from 'shared/views/files/Uploader';
  import FileStatusCard from 'shared/views/files/FileStatusCard';
  import FileStatusText from 'shared/views/files/FileStatusText';
  import Thumbnail from 'shared/views/files/Thumbnail';
  import FileDropzone from 'shared/views/files/FileDropzone';

  const ASPECT_RATIO = 16 / 9;
  const DEFAULT_THUMBNAIL = {
    thumbnail: null,
    thumbnail_url: '',
    thumbnail_encoding: {},
  };

  export default {
    name: 'ChannelThumbnail',
    components: {
      Uploader,
      ActionLink,
      FileStatusCard,
      FileStatusText,
      IconButton,
      Thumbnail,
      FileDropzone,
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
        uploadingId: null,
      };
    },
    computed: {
      ...mapGetters('file', ['getUploadsInProgress', 'getFiles']),
      file() {
        return this.getFiles([this.uploadingId]);
      },
      hasError() {
        return this.file && this.file.error;
      },
      uploading() {
        return this.uploadingId && this.getUploadsInProgress([this.uploadingId]).length;
      },
      height() {
        return this.width / ASPECT_RATIO;
      },
      thumbnailSrc() {
        return this.value.thumbnail_encoding.base64 || this.value.thumbnail_url;
      },
    },
    watch: {
      hasError(error) {
        if (error) this.reset();
      },
      uploading(uploading) {
        if (!uploading) {
          let file = this.getFiles([this.uploadingId])[0];
          this.updateThumbnail({
            thumbnail: `${file.checksum}.${file.file_format}`,
            thumbnail_url: file.url,
            thumbnail_encoding: {},
          });
        }
      },
    },
    methods: {
      updateThumbnail(data) {
        let thumbnailData = {
          ...this.value,
          ...data,
        };
        this.lastThumbnail = thumbnailData;
        this.$emit('input', thumbnailData);
      },
      handleUploading(files) {
        if (files[0]) {
          this.lastThumbnail = this.value;
          this.uploadingId = files[0].id;
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
      },
      remove() {
        this.updateThumbnail(DEFAULT_THUMBNAIL);
      },
      save() {
        this.updateThumbnail({
          thumbnail_encoding: {
            ...this.Cropper.getMetadata(),
            base64: this.Cropper.generateDataUrl(),
          },
        });
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
    border: 4px solid var(--v-grey-darken2);
  }

</style>
