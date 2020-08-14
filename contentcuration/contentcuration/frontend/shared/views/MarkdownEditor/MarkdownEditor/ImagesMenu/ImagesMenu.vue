<template>

  <div class="images-menu" @click.stop>
    <div :class="anchorArrowClasses"></div>

    <VCard elevation="20" style="min-width: 500px;">
      <VCardTitle class="py-1">
        <VLayout align-center justify-space-between>
          <VFlex class="font-weight-bold">
            {{ $tr('imageHeader') }}
          </VFlex>
          <VBtn
            flat
            color="primary"
            :disabled="!fileSrc || uploading || hasError"
            @click="onInsertClick"
          >
            {{ $tr('btnLabelInsert') }}
          </VBtn>
        </VLayout>
      </VCardTitle>
      <VDivider class="mt-0" />
      <VCardText>
        <Uploader
          :presetID="imagePreset"
          @uploading="handleUploading"
        >
          <template #default="{openFileDialog, handleFiles}">
            <div class="body-1 mb-2 mx-2">
              <FileStatusText
                v-if="uploadingChecksum"
                permanent
                :checksum="uploadingChecksum"
                @open="openFileDialog"
              />
              <span v-else-if="fileSrc" class="grey--text">
                <ActionLink
                  :text="$tr('selectFile')"
                  class="mr-2"
                  @click="openFileDialog"
                />
                {{ $tr('currentImageDefaultText') }}
              </span>
            </div>
            <FileDropzone
              @dropped="handleFiles"
              @click="openFileDialog"
            >
              <VCard class="pa-0 upload-area" flat>
                <!-- Default drop text -->
                <VContainer v-if="!fileSrc" fluid class="py-5">
                  <VLayout align-center space-around class="text-xs-center">
                    <VFlex>
                      <p class="subheading">
                        {{ $tr('defaultDropText') }}
                      </p>
                      <VBtn>
                        {{ $tr('selectFileButton') }}
                      </VBtn>
                      <p class="caption grey--text my-3">
                        {{ $tr('acceptsText', {acceptedFormats}) }}
                      </p>
                    </VFlex>
                  </VLayout>
                </VContainer>
                <!-- Uploading status -->
                <VCard v-else-if="uploading || hasError" flat style="padding: 28% 0;">
                  <VLayout wrap align-center justify-center style="max-height: 0px;">
                    <div class="text-xs-center" style="position: absolute;">
                      <p>
                        <FileStatus :checksum="uploadingChecksum" large />
                      </p>
                      <ActionLink
                        v-if="!hasError"
                        :text="$tr('btnLabelCancel')"
                        data-test="cancel-upload"
                        @click="cancelPendingFile"
                      />
                    </div>
                  </VLayout>
                </VCard>
                <!-- Image preview -->
                <div v-else>
                  <img :src="fileSrc" class="image-preview">
                </div>
              </VCard>
            </FileDropzone>
          </template>
        </Uploader>

        <VTextField
          v-if="fileSrc"
          v-model="altText"
          box
          :label="$tr('altTextLabel')"
          class="mt-4"
          persistent-hint
          :hint="$tr('altTextHint')"
        />
      </VCardText>
    </VCard>
  </div>

</template>

<script>

  import { mapGetters } from 'vuex';
  import Uploader from 'shared/views/files/Uploader';
  import FileStatusText from 'shared/views/files/FileStatusText';
  import FileStatus from 'shared/views/files/FileStatus';
  import FileDropzone from 'shared/views/files/FileDropzone';
  import FormatPresetsMap, { FormatPresetsNames } from 'shared/leUtils/FormatPresets';

  const ANCHOR_ARROW_SIDE_LEFT = 'left';
  const ANCHOR_ARROW_SIDE_RIGHT = 'right';

  export default {
    name: 'ImagesMenu',
    components: {
      Uploader,
      FileStatusText,
      FileDropzone,
      FileStatus,
    },
    props: {
      anchorArrowSide: {
        type: String,
        default: ANCHOR_ARROW_SIDE_LEFT,
        validator: value => {
          return [ANCHOR_ARROW_SIDE_LEFT, ANCHOR_ARROW_SIDE_RIGHT].includes(value);
        },
      },
      src: {
        type: String,
        default: '',
      },
      alt: {
        type: String,
        default: '',
      },
    },
    data() {
      return {
        uploadingChecksum: '',
        altText: '',
      };
    },
    computed: {
      ...mapGetters('file', ['getFileUpload']),
      anchorArrowClasses() {
        const classes = ['anchor-arrow'];

        if (this.anchorArrowSide === ANCHOR_ARROW_SIDE_RIGHT) {
          classes.push('anchor-arrow-right');
        }

        return classes;
      },
      imagePreset() {
        return FormatPresetsNames.EXERCISE_IMAGE;
      },
      acceptedFormats() {
        // TODO: Properly handle lists for i18n
        const allowedFormats = FormatPresetsMap.get(this.imagePreset).allowed_formats;
        return allowedFormats.join(', ');
      },

      file() {
        return this.getFileUpload(this.uploadingChecksum);
      },
      fileSrc() {
        return (this.file && this.file.file_on_disk) || this.src;
      },
      hasError() {
        return this.file && this.file.error;
      },
      uploading() {
        return this.file && this.file.uploading;
      },
    },
    mounted() {
      this.altText = this.alt;
    },
    methods: {
      onInsertClick() {
        if (this.fileSrc) {
          this.$emit('insert', {
            src: this.fileSrc,
            alt: this.altText || '',
          });
        }
      },
      handleUploading(fileUpload) {
        if (fileUpload.checksum) {
          this.uploadingChecksum = fileUpload.checksum;
        }
      },
      cancelPendingFile() {
        this.uploadingChecksum = '';
      },
    },
    $trs: {
      imageHeader: 'Upload image',
      btnLabelInsert: 'Insert',
      btnLabelCancel: 'Cancel',
      altTextLabel: 'Image description',
      altTextHint:
        'The image description is used by visually impaired users and displays when the image fails to load',
      defaultDropText: 'Drag and drop an image here, or upload manually',
      selectFileButton: 'Select file',
      acceptsText: 'Accepts {acceptedFormats}',
      currentImageDefaultText: 'Current image',
      selectFile: 'Select file',
    },
  };

</script>

<style lang="less" scoped>

  .images-menu {
    position: relative;
    z-index: 1;
    max-width: 500px;
    // to make positioning from a parent element easier - this
    // makes sure that the tip of the anchor will be considered
    // as top right/left corner
    margin-top: 16px;
    margin-right: -30px;
    margin-left: -30px;
  }

  .anchor-arrow {
    position: absolute;
    top: -40px;
    left: 10px;
    z-index: 3;
    width: 40px;
    height: 40px;
    overflow: hidden;

    &::after {
      position: absolute;
      top: 28px;
      right: 0;
      left: 6px;
      width: 25px;
      height: 25px;
      content: '';
      background: #ffffff;
      box-shadow: -1px -1px 10px -2px rgba(0, 0, 0, 0.3);
      transform: rotate(45deg);
    }

    &.anchor-arrow-right {
      right: 10px;
      left: initial;
    }
  }

  .v-card__text {
    position: relative;
  }

  .upload-area {
    border: 1px solid var(--v-grey-lighten4) !important;
  }

  .image-preview {
    max-width: 100%;
  }

</style>
