<template>

  <div :key="`thumbnail-${nodeId}-${value && value.id}`">
    <Uploader :presetID="thumbnailPresetID" @uploading="handleUploading">
      <template #default="{openFileDialog, handleFiles}">
        <!-- Thumbnail status -->
        <VLayout row align-center :class="hasError? 'red--text' : 'grey--text'" class="body-1">
          <FileStatusText
            v-if="value && value.error || uploading"
            :checksum="value && value.checksum"
            @open="openFileDialog"
          />
          <template v-else>
            <VFlex class="text-truncate" shrink style="line-height: unset !important;">
              {{ headerText }}
            </VFlex>
            <VFlex v-if="showFileSize" class="text-xs-right" grow>
              {{ formatFileSize(value.file_size) }}
            </VFlex>
          </template>
        </VLayout>

        <!-- Thumbnail area -->
        <div class="mt-2">
          <!-- Status card -->
          <div v-if="loading || hasError" style="border: 2px solid transparent;">
            <ThumbnailCard ref="thumbnail" data-test="loading">
              <p>
                <VProgressCircular
                  v-if="generating"
                  :size="60"
                  :width="8"
                  indeterminate
                  data-test="generating"
                  color="greenSuccess"
                />
                <FileStatus v-else :checksum="value.checksum" large data-test="progress" />
              </p>
              <ActionLink
                v-if="!hasError"
                :text="$tr('cancel')"
                data-test="cancel-upload"
                @click="cancelPendingFile"
              />
            </ThumbnailCard>
          </div>

          <!-- Cropper -->
          <croppa
            v-else-if="cropping"
            v-model="Cropper"
            data-test="cropper"
            :zoom-speed="10"
            :width="cropDimensions.width"
            :height="cropDimensions.height"
            :show-remove-button="false"
            :initial-image="thumbnailSrc"
            initial-size="contain"
            :style="{borderColor: $vuetify.theme.darkGrey}"
            @new-image-drawn="cropperLoaded"
          />

          <!-- Thumbnail -->
          <FileDropzone
            v-else-if="thumbnailSrc"
            @dropped="handleFiles"
            @click="openFileDialog"
          >
            <Thumbnail
              ref="thumbnail"
              data-test="thumbnail-image"
              :src="thumbnailSrc"
              :encoding="encoding"
            />
          </FileDropzone>

          <!-- Default image -->
          <FileDropzone v-else @dropped="handleFiles" @click="openFileDialog">
            <ThumbnailCard
              ref="thumbnail"
              data-test="default-image"
              @click="openFileDialog"
            >
              <Icon large>
                image
              </Icon>
            </ThumbnailCard>
          </FileDropzone>
        </div>

        <!-- Toolbar -->
        <VLayout v-show="!loading" row align-center data-test="toolbar">
          <!-- Generating option -->
          <ThumbnailGenerator
            v-show="allowGeneration"
            ref="generator"
            :filePath="primaryFilePath"
            :presetID="thumbnailPresetID"
            :handleFiles="handleFiles"
            @generating="startGenerating"
            @error="cancelPendingFile"
          >
            <template #default="{generate}">
              <IconButton
                :disabled="!primaryFilePath"
                icon="camera"
                :text="$tr('generate')"
                class="ma-0"
                @click="generate"
              />
            </template>
          </ThumbnailGenerator>

          <!-- Cropping options -->
          <span v-if="cropping">
            <IconButton
              icon="add"
              data-test="zoomin"
              :text="$tr('zoomIn')"
              class="ma-0"
              @click="Cropper && Cropper.zoomIn()"
              @mousedown="cropZoomIn"
              @mouseup="cropZoomStop"
            />
            <IconButton
              icon="remove"
              data-test="zoomout"
              :text="$tr('zoomOut')"
              class="ma-0"
              @click="Cropper && Cropper.zoomOut()"
              @mousedown="cropZoomOut"
              @mouseup="cropZoomStop"
            />
          </span>

          <!-- Default options -->
          <template v-else-if="!loading">
            <IconButton
              icon="image"
              :text="$tr('upload')"
              class="ma-0"
              @click="openFileDialog"
            />
            <IconButton
              v-if="!hasError && value"
              icon="crop"
              :text="$tr('crop')"
              class="ma-0"
              @click="startCropping(false)"
            />
          </template>

          <VSpacer />
          <div v-if="!loading">
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
              v-else-if="value"
              icon="clear"
              data-test="remove"
              :text="$tr('remove')"
              @click="$emit('input', null)"
            />
          </div>
        </VLayout>
      </template>
    </Uploader>
  </div>

</template>

<script>

  import { mapGetters } from 'vuex';
  import ThumbnailGenerator from './ThumbnailGenerator';
  import ThumbnailCard from './ThumbnailCard';
  import { fileSizeMixin, fileStatusMixin } from 'shared/mixins';
  import { FormatPresetsList } from 'shared/leUtils/FormatPresets';
  import Uploader from 'shared/views/files/Uploader';
  import FileDropzone from 'shared/views/files/FileDropzone';
  import FileStatus from 'shared/views/files/FileStatus';
  import FileStatusText from 'shared/views/files/FileStatusText';
  import IconButton from 'shared/views/IconButton';
  import Thumbnail from 'shared/views/files/Thumbnail';

  export default {
    name: 'ContentNodeThumbnail',
    components: {
      Uploader,
      FileDropzone,
      FileStatus,
      FileStatusText,
      ThumbnailGenerator,
      IconButton,
      Thumbnail,
      ThumbnailCard,
    },
    mixins: [fileSizeMixin, fileStatusMixin],
    props: {
      value: {
        type: Object,
        required: false,
        validator: file => {
          return file.preset.thumbnail && file.file_size && file.id;
        },
      },
      encoding: {
        type: Object,
        default() {
          return {};
        },
      },
      nodeId: {
        type: String,
        required: true,
      },
    },
    data() {
      return {
        cropping: false,
        generating: false,
        lastThumbnail: null,
        lastEncoding: null,
        removeOnCancel: false,
        cancelCurrentUpload: false,
        Cropper: {},
        cropDimensions: {
          width: 160,
          height: 90,
        },
        zoomInterval: null,
      };
    },
    computed: {
      ...mapGetters('contentNode', ['getContentNode']),
      ...mapGetters('file', ['getContentNodeFiles']),
      files() {
        return this.getContentNodeFiles(this.nodeId);
      },
      allowGeneration() {
        // Not allowed for channels, when operations are in progress, or in cropping mode
        return this.kind && !this.loading && !this.cropping;
      },
      thumbnailPresetID() {
        return FormatPresetsList.find(p => p.thumbnail && p.kind_id === (this.kind || null)).id;
      },
      loading() {
        return this.uploading || this.generating;
      },
      hasError() {
        return this.value && this.value.error;
      },
      showFileSize() {
        return this.value && !this.hasError && !this.loading && !this.cropping;
      },
      headerText() {
        if (this.generating) {
          return this.$tr('generatingThumbnail');
        } else if (this.hasError) {
          return this.errorMessage(this.value.checksum);
        } else if (this.uploading) {
          return this.$tr('uploadingThumbnail');
        } else if (!this.value) {
          return this.$tr('noThumbnail');
        } else if (this.cropping) {
          return this.$tr('croppingPrompt');
        }
        const filename = this.value.original_filename || this.$tr('defaultFilename');
        const fileparts = filename.split('.');
        return fileparts.slice(0, fileparts.length - 1).join('.');
      },
      thumbnailSrc() {
        return this.value && this.value.url;
      },
      uploading() {
        return this.value && this.value.uploading;
      },
      node() {
        return this.getContentNode(this.nodeId);
      },
      kind() {
        return this.node && this.node.kind;
      },
      primaryFilePath() {
        if (!this.nodeId) {
          return null;
        }

        const file = this.files.find(f => !f.preset.supplementary && f.url);
        return (file && file.url.split('?')[0]) || '';
      },
    },
    watch: {
      nodeId(id) {
        if (id) {
          this.reset();
        }
      },
      hasError(error) {
        if (error) this.reset();
      },
    },
    methods: {
      handleUploading(fileUpload) {
        if (!this.cancelCurrentUpload) {
          this.lastThumbnail = this.value;
          this.lastEncoding = this.encoding;
          this.$emit('encoded', null);
          this.$emit('input', {
            preset: this.thumbnailPresetID,
            contentnode: this.nodeId,
            ...fileUpload,
          });
          this.startCropping(true);
        }
        this.generating = false;
        this.cancelCurrentUpload = false;
      },
      startGenerating() {
        this.lastThumbnail = this.value;
        this.lastEncoding = this.encoding;
        this.generating = true;
      },
      cancelPendingFile() {
        this.cancelCurrentUpload = true;
        if (this.removeOnCancel) {
          this.$emit('input', this.lastThumbnail);
          this.$emit('encoded', this.lastEncoding);
          this.reset();
        } else {
          this.cropping = false;
        }
      },

      /* CROPPING FUNCTION */
      startCropping(removeOnCancel) {
        this.cropDimensions.width = this.$refs.thumbnail.$el.clientWidth;
        this.cropDimensions.height = (this.cropDimensions.width * 9) / 16;
        this.cropping = true;
        this.removeOnCancel = removeOnCancel;
      },
      cropperLoaded() {
        this.Cropper.applyMetadata(this.encoding);
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
        this.generating = false;
        this.lastThumbnail = null;
        this.lastEncoding = null;
      },
      save() {
        // Calls setter method
        this.$emit('encoded', {
          ...this.Cropper.getMetadata(),
          base64: this.Cropper.generateDataUrl(),
        });
        this.lastThumbnail = this.value;
        this.lastEncoding = this.encoding;
        this.reset();
      },
    },
    $trs: {
      noThumbnail: 'No thumbnail',
      crop: 'Crop',
      generate: 'Generate from file',
      upload: 'Upload image',
      remove: 'Remove',
      zoomIn: 'Zoom in',
      zoomOut: 'Zoom out',
      save: 'Save',
      cancel: 'Cancel',
      croppingPrompt: 'Drag image to reframe',
      uploadingThumbnail: 'Uploading',
      generatingThumbnail: 'Generating from file',
      defaultFilename: 'File',
    },
  };

</script>

<style lang="less" scoped>

  /deep/ canvas {
    border: 2px solid var(--v-grey-darken2);
  }

  /deep/ img {
    border: 1px solid var(--v-greyBorder-base);
  }

</style>
