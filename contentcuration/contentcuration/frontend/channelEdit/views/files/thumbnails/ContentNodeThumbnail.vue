<template>

  <div :key="`thumbnail-${nodeId}-${fileUploadId || (value && value.id)}`">
    <Uploader
      :presetID="thumbnailPresetID"
      :uploadingHandler="handleUploading"
      :uploadCompleteHandler="handleUploadComplete"
    >
      <template #default="{ openFileDialog, handleFiles }">
        <!-- Thumbnail status -->
        <VLayout
          row
          align-center
          :class="hasError ? 'red--text' : 'grey--text'"
          class="body-1"
        >
          <FileStatusText
            v-if="(fileUpload && fileUpload.error) || uploading"
            :fileId="fileUpload && fileUpload.id"
            @open="openFileDialog"
          />
          <template v-else>
            <VFlex
              class="pr-2 text-truncate"
              shrink
              style="line-height: unset !important"
            >
              {{ headerText }}
            </VFlex>
            <VFlex
              v-if="showFileSize"
              class="text-xs-right"
              grow
            >
              {{ formatFileSize(fileUpload.file_size) }}
            </VFlex>
          </template>
        </VLayout>

        <!-- Thumbnail area -->
        <div class="mt-2">
          <!-- Status card -->
          <div
            v-if="loading || hasError"
            style="border: 2px solid transparent"
          >
            <ThumbnailCard
              ref="thumbnail"
              data-test="loading"
            >
              <p>
                <VProgressCircular
                  v-if="generating"
                  :size="60"
                  :width="8"
                  indeterminate
                  data-test="generating"
                  color="greenSuccess"
                />
                <FileStatus
                  v-else
                  :fileId="fileUpload.id"
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
            </ThumbnailCard>
          </div>

          <!-- Cropper -->
          <croppa
            v-else-if="cropping"
            v-model="Cropper"
            data-test="cropper"
            :placeholder="$tr('noThumbnail')"
            :disable-click-to-choose="true"
            :disable-drag-and-drop="true"
            :zoom-speed="10"
            :width="width"
            :height="height"
            :show-remove-button="false"
            :initial-image="thumbnailSrc"
            :prevent-white-space="true"
            initial-size="contain"
            :style="{ borderColor: $vuetify.theme.darkGrey }"
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
              :encoding="displayEncoding"
            />
          </FileDropzone>

          <!-- Default image -->
          <FileDropzone
            v-else
            @dropped="handleFiles"
            @click="openFileDialog"
          >
            <ThumbnailCard
              ref="thumbnail"
              data-test="default-image"
              @click="openFileDialog"
            >
              <Icon
                icon="image"
                style="font-size: 25px"
              />
            </ThumbnailCard>
          </FileDropzone>
        </div>

        <!-- Toolbar -->
        <VLayout
          v-show="!loading"
          row
          align-center
          data-test="toolbar"
        >
          <!-- Generating option -->
          <ThumbnailGenerator
            v-show="allowGeneration"
            ref="generator"
            :filePath="primaryFilePath"
            :fileName="primaryFileName"
            :presetID="thumbnailPresetID"
            :handleFiles="handleFiles"
            @generating="startGenerating"
            @error="cancelPendingFile"
          >
            <template #default="{ generate }">
              <IconButton
                :disabled="!primaryFilePath"
                icon="generateThumbnail"
                :text="$tr('generate')"
                class="ma-0"
                @click="generate"
              />
            </template>
          </ThumbnailGenerator>

          <!-- Cropping options -->
          <span v-if="cropping">
            <IconButton
              icon="plus"
              data-test="zoomin"
              :text="$tr('zoomIn')"
              class="ma-0"
              @click="Cropper && Cropper.zoomIn()"
              @mousedown="cropZoomIn"
              @mouseup="cropZoomStop"
            />
            <IconButton
              icon="minus"
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
              <ActionLink
                :text="$tr('save')"
                data-test="save"
                @click="save"
              />
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

  import { mapActions, mapGetters } from 'vuex';
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
  import { ASPECT_RATIO, THUMBNAIL_WIDTH } from 'shared/constants';

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
        default: null,
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
        removeOnCancel: false,
        Cropper: {},
        zoomInterval: null,
        fileUploadId: null,
        newEncoding: null,
      };
    },
    computed: {
      ...mapGetters('contentNode', ['getContentNode']),
      ...mapGetters('file', ['getContentNodeFiles', 'getFileUpload']),
      files() {
        return this.getContentNodeFiles(this.nodeId);
      },
      fileUpload() {
        return this.fileUploadId && this.getFileUpload(this.fileUploadId);
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
        return Boolean(this.fileUpload && this.fileUpload.error);
      },
      showFileSize() {
        return this.fileUpload && !this.hasError && !this.loading && !this.cropping;
      },
      originalFilename() {
        if (this.fileUpload) {
          return this.fileUpload.original_filename;
        }
        if (this.value) {
          return this.value.original_filename;
        }
        return this.$tr('defaultFilename');
      },
      headerText() {
        if (this.generating) {
          return this.$tr('generatingThumbnail');
        } else if (this.hasError) {
          return this.errorMessage(this.fileUpload.id);
        } else if (this.uploading) {
          return this.$tr('uploadingThumbnail');
        } else if (!this.value) {
          return this.$tr('noThumbnail');
        } else if (this.cropping) {
          return this.$tr('croppingPrompt');
        }
        const filename = this.originalFilename;
        const fileparts = filename.split('.');
        return fileparts.slice(0, fileparts.length - 1).join('.');
      },
      thumbnailSrc() {
        if (this.fileUpload) {
          if (this.uploading) {
            return this.fileUpload.previewSrc;
          }
          return this.fileUpload.url;
        }
        if (this.value) {
          return this.value.url;
        }
        return '';
      },
      displayEncoding() {
        if (this.newEncoding) {
          return this.newEncoding;
        }
        return this.encoding;
      },
      uploading() {
        return this.fileUpload && this.fileUpload.uploading;
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
      primaryFileName() {
        if (!this.nodeId) {
          return null;
        }

        const file = this.files.find(f => !f.preset.supplementary && f.url);
        return (file && `${file.checksum}.${file.file_format}`) || '';
      },
      width() {
        return THUMBNAIL_WIDTH;
      },
      height() {
        return this.width / ASPECT_RATIO;
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
      ...mapActions('file', ['deleteFile']),
      handleUploading(fileUpload) {
        // Set a blank encoding so that we apply
        // new croppa metadata to the new image.
        this.newEncoding = {};
        this.fileUploadId = fileUpload.id;
      },
      handleUploadComplete(fileUpload) {
        if (fileUpload.id === this.fileUploadId) {
          this.$nextTick(() => {
            this.startCropping(true);
            this.generating = false;
          });
        }
      },
      startGenerating() {
        this.generating = true;
        this.removeOnCancel = true;
      },
      cancelPendingFile() {
        if (this.generating) {
          this.$refs.generator.cancel();
        }
        if (this.removeOnCancel) {
          if (this.fileUpload) {
            this.deleteFile(this.fileUpload);
          }
          this.reset();
        } else {
          this.cropping = false;
          this.generating = false;
        }
      },

      /* CROPPING FUNCTION */
      startCropping(removeOnCancel) {
        this.cropping = true;
        this.removeOnCancel = removeOnCancel;
      },
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
        this.generating = false;
      },
      save() {
        const id = this.fileUploadId || this.value.id;
        // Calls setter method
        this.$emit('input', {
          id,
          preset: this.thumbnailPresetID,
          contentnode: this.nodeId,
        });
        this.newEncoding = {
          ...this.Cropper.getMetadata(),
          base64: this.Cropper.generateDataUrl(),
        };
        this.$emit('encoded', this.newEncoding);
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
      /* eslint-disable kolibri/vue-no-unused-translations */
      retryUpload: 'Retry upload',
      uploadFailed: 'Upload failed',
      /* eslint-enable kolibri/vue-no-unused-translations */
    },
  };

</script>


<style lang="scss" scoped>

  ::v-deep canvas {
    border: 2px solid var(--v-grey-darken2);
  }

</style>
