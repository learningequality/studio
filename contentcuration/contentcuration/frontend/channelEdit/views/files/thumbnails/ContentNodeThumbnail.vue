<template>

  <div :key="nodeId">
    <!-- Thumbnail status -->
    <VLayout row align-center :class="hasError? 'red--text' : 'grey--text'" class="body-1">
      <template v-if="value && value.error || uploading">
        <Uploader :allowDrop="false" :presetID="thumbnailPresetID" @uploading="handleUploading">
          <template #default="{openFileDialog}">
            <FileStatusText
              :checksum="value && value.checksum"
              :readonly="readonly"
              @open="openFileDialog"
            />
          </template>
        </Uploader>
      </template>
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
    <div class="my-2 image-wrapper">
      <div v-if="loading || hasError" style="border: 2px solid transparent;">
        <VCard
          ref="thumbnail"
          data-test="loading"
          color="grey lighten-4"
          style="padding: 28% 0;"
          flat
        >
          <VLayout row wrap align-center justify-center style="max-height: 0px;">
            <div class="text-xs-center" style="position: absolute;">
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
            </div>
          </VLayout>
        </VCard>
      </div>

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

      <Uploader
        v-else
        :presetID="thumbnailPresetID"
        :readonly="readonly"
        :borderColor="$vuetify.theme.greyBorder"
        @uploading="handleUploading"
      >
        <template #default="{openFileDialog}">
          <VCard
            v-if="!thumbnailSrc"
            ref="thumbnail"
            data-test="default-image"
            color="grey lighten-4"
            style="padding: 28% 0;"
            flat
            @click="openFileDialog"
          >
            <VLayout row wrap align-center justify-center style="max-height: 0px;">
              <div style="position: absolute;">
                <ContentNodeIcon :kind="kind" :showColor="false" size="64px" />
              </div>
            </VLayout>
          </VCard>

          <VImg
            v-else
            ref="thumbnail"
            data-test="thumbnail-image"
            :aspect-ratio="16/9"
            :src="encoding && encoding.base64 || thumbnailSrc"
            :lazy-src="encoding && encoding.base64 || thumbnailSrc"
            contain
            :class="{editing: !readonly}"
            @click="openFileDialog"
          />
        </template>
      </Uploader>
    </div>

    <!-- Toolbar -->
    <VLayout v-if="!readonly" v-show="!loading" row data-test="toolbar">
      <!-- Generating option -->
      <ThumbnailGenerator
        v-show="allowGeneration"
        ref="generator"
        :filePath="primaryFilePath"
        :presetID="thumbnailPresetID"
        style="margin: -2px;"
        @generating="startGenerating"
        @uploading="handleUploading"
        @error="cancelPendingFile"
      >
        <template #default="{generate}">
          <IconButton
            :disabled="!primaryFilePath"
            icon="camera"
            :text="$tr('generate')"
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
      </span>

      <!-- Default options -->
      <template v-else-if="!loading">
        <div style="margin: -3px;">
          <Uploader :allowDrop="false" :presetID="thumbnailPresetID" @uploading="handleUploading">
            <template #default="{openFileDialog}">
              <IconButton
                icon="image"
                :text="$tr('upload')"
                @click="openFileDialog"
              />
            </template>
          </Uploader>
        </div>
        <IconButton
          v-if="!hasError && value"
          icon="crop"
          :text="$tr('crop')"
          @click="startCropping"
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
  </div>

</template>

<script>

  import { mapGetters } from 'vuex';
  import ThumbnailGenerator from './ThumbnailGenerator';
  import { fileSizeMixin, fileStatusMixin } from 'shared/mixins';
  import { FormatPresetsList } from 'shared/leUtils/FormatPresets';
  import Uploader from 'shared/views/files/Uploader';
  import ActionLink from 'shared/views/ActionLink.vue';
  import FileStatus from 'frontend/channelEdit/views/files/FileStatus';
  import FileStatusText from 'frontend/channelEdit/views/files/FileStatusText';
  import ContentNodeIcon from 'shared/views/ContentNodeIcon';
  import IconButton from 'shared/views/IconButton';

  export default {
    name: 'ContentNodeThumbnail',
    components: {
      Uploader,
      ActionLink,
      FileStatus,
      FileStatusText,
      ThumbnailGenerator,
      ContentNodeIcon,
      IconButton,
    },
    mixins: [fileSizeMixin, fileStatusMixin],
    props: {
      value: {
        type: Object,
        required: false,
        validator: file => {
          return file.preset.thumbnail && file.original_filename && file.file_size && file.id;
        },
      },
      readonly: {
        type: Boolean,
        default: false,
      },
      encoding: {
        type: Object,
        default() {
          return {};
        },
      },
      nodeId: {
        type: String,
        required: false,
      },
    },
    data() {
      return {
        cropping: false,
        generating: false,
        lastThumbnail: null,
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
        return this.hasError && !this.loading && !this.cropping;
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
        let fileparts = this.value.original_filename.split('.');
        return fileparts.slice(0, fileparts.length - 1).join('.');
      },
      thumbnailSrc() {
        return (
          (this.value && this.value.url) ||
          (!this.kind && '/static/img/kolibri_placeholder.png') ||
          ''
        );
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
        let file = this.getContentNodeFiles(this.nodeId).find(
          f => !f.preset.supplementary && f.url
        );
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
        this.lastThumbnail = this.value;
        this.$emit('input', {
          preset: this.thumbnailPresetID,
          contentnode: this.nodeId,
          ...fileUpload,
        });
        this.startCropping();
        this.generating = false;
      },
      startGenerating() {
        this.lastThumbnail = this.value;
        this.generating = true;
      },
      cancelPendingFile() {
        this.$emit('input', this.lastThumbnail);
        this.reset();
      },

      /* CROPPING FUNCTION */
      startCropping() {
        this.cropDimensions.width = this.$refs.thumbnail.$el.clientWidth;
        this.cropDimensions.height = (this.cropDimensions.width * 9) / 16;
        this.cropping = true;
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
      },
      save() {
        // Calls setter method
        this.$emit('encoded', {
          ...this.Cropper.getMetadata(),
          base64: this.Cropper.generateDataUrl(),
        });
        this.lastThumbnail = this.value;
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
    },
  };

</script>

<style lang="less" scoped>

  /deep/ canvas {
    border: 2px solid var(--v-grey-darken2);
  }

</style>
