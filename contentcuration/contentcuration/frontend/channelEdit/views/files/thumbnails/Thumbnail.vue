<template>

  <div>
    <!-- Thumbnail status -->
    <VLayout row align-center class="grey--text" style="font-size: 12pt;">
      <VFlex class="text-truncate" shrink style="line-height: unset !important;">
        {{ headerText }}
      </VFlex>
      <VFlex v-if="value && !loading && !cropping" class="text-xs-right" grow>
        {{ formatFileSize(value.file_size) }}
      </VFlex>
    </VLayout>

    <!-- Thumbnail area -->
    <div class="my-2 image-wrapper">
      <div v-if="loading" style="border: 2px solid transparent;">
        <VCard
          ref="thumbnail"
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
                  color="greenSuccess"
                />
                <FileStatus v-else :fileIDs="[value.id]" large />
              </p>
              <ActionLink :text="$tr('cancel')" @click="cancelPendingFile" />
            </div>
          </VLayout>
        </VCard>
      </div>

      <croppa
        v-else-if="cropping"
        v-model="Cropper"
        :zoom-speed="10"
        :width="cropDimensions.width"
        :height="cropDimensions.height"
        :show-remove-button="false"
        :initial-image="thumbnailSrc"
        initial-size="contain"
        :style="{borderColor: $vuetify.theme.darkGrey}"
        @init="cropperLoaded"
      />

      <Uploader
        v-else
        :presetID="thumbnailPresetID"
        :readonly="readonly"
        :borderColor="$vuetify.theme.grey.lighten2"
        @uploading="handleUploading"
      >
        <template #default="{openFileDialog}">
          <VCard
            v-if="!thumbnailSrc"
            ref="thumbnail"
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
    <VLayout v-if="!readonly" v-show="!loading" row>
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
          <ThumbnailToolbarIcon
            :disabled="!primaryFilePath"
            icon="camera"
            :tooltip="$tr('generate')"
            @click="generate"
          />
        </template>
      </ThumbnailGenerator>

      <!-- Cropping options -->
      <span v-if="cropping">
        <ThumbnailToolbarIcon
          icon="add"
          :tooltip="$tr('zoomIn')"
          @click="Cropper && Cropper.zoomIn()"
          @mousedown="cropZoomIn"
          @mouseup="cropZoomStop"
        />
        <ThumbnailToolbarIcon
          icon="remove"
          :tooltip="$tr('zoomOut')"
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
              <ThumbnailToolbarIcon
                icon="image"
                :tooltip="$tr('upload')"
                @click="openFileDialog"
              />
            </template>
          </Uploader>
        </div>
        <ThumbnailToolbarIcon
          v-if="value"
          icon="crop"
          :tooltip="$tr('crop')"
          @click="startCropping"
        />
      </template>

      <VSpacer />
      <div v-if="!loading">
        <span v-if="generated || cropping">
          <ActionLink class="mr-3" :text="$tr('cancel')" @click="reset" />
          <ActionLink :text="$tr('save')" @click="save" />
        </span>
        <ThumbnailToolbarIcon
          v-else-if="value"
          icon="clear"
          :tooltip="$tr('remove')"
          @click="$emit('input', null)"
        />
      </div>
    </VLayout>
  </div>

</template>

<script>

  import { mapGetters } from 'vuex';
  import ThumbnailToolbarIcon from './ThumbnailToolbarIcon';
  import ThumbnailGenerator from './ThumbnailGenerator';
  import Constants from 'edit_channel/constants/index';
  import Uploader from 'frontend/channelEdit/views/files/Uploader';
  import ActionLink from 'edit_channel/sharedComponents/ActionLink.vue';
  import FileStatus from 'frontend/channelEdit/views/files/FileStatus';
  import ContentNodeIcon from 'shared/views/ContentNodeIcon';
  import { fileSizeMixin } from 'edit_channel/file_upload/mixins';

  export default {
    name: 'Thumbnail',
    components: {
      Uploader,
      ThumbnailToolbarIcon,
      ActionLink,
      FileStatus,
      ThumbnailGenerator,
      ContentNodeIcon,
    },
    mixins: [fileSizeMixin],
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
      kind: {
        type: String,
        required: false,
      },
      encoding: {
        type: Object,
        default() {
          return {};
        },
      },
      primaryFilePath: {
        type: String,
        required: false,
      },
    },
    data() {
      return {
        cropping: false,
        generated: false,
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
      ...mapGetters('file', ['getUploadsInProgress']),
      allowGeneration() {
        // Not allowed for channels, when operations are in progress, or in cropping mode
        return this.kind && !this.loading && (!this.cropping || this.generated);
      },
      thumbnailPresetID() {
        return Constants.FormatPresets.find(p => p.thumbnail && p.kind_id === (this.kind || null))
          .id;
      },
      loading() {
        return this.uploading || this.generating;
      },
      headerText() {
        if (this.generating) {
          return this.$tr('generatingThumbnail');
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
          (this.value && this.value.file_on_disk) ||
          (!this.kind && '/static/img/kolibri_placeholder.png') ||
          ''
        );
      },
      uploading() {
        return this.value && this.getUploadsInProgress([this.value.id]).length;
      },
    },
    methods: {
      handleUploading(file) {
        this.lastThumbnail = this.value;
        this.$emit('input', file[0]);
        this.startCropping();
        this.generating = false;
      },
      startGenerating() {
        this.lastThumbnail = this.value;
        this.generating = true;
        this.generated = true;
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
        this.generated = false;
      },
      save() {
        // Calls setter method
        this.$emit('encoded', {
          ...this.Cropper.getMetadata(),
          base64: this.Cropper.generateDataUrl(),
        });
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
