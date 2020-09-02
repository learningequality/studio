<template>

  <Uploader
    :key="`file-${file && file.id}`"
    :presetID="preset.id"
    @uploading="file => $emit('uploading', file)"
  >
    <template #default="{openFileDialog, handleFiles}">
      <FileDropzone @dropped="handleFiles">
        <VListTile
          data-test="list-item"
          v-bind="$attrs"
          @click.stop="openFileDialog"
        >
          <VListTileAction @click.stop="$emit('selected')">
            <VRadio
              v-if="file"
              :key="file.id"
              :value="file.id"
              color="primary"
              data-test="radio"
            />
          </VListTileAction>
          <VListTileContent>
            <VListTileSubTitle>{{ translateConstant(preset.id) }}</VListTileSubTitle>
            <VListTileTitle>
              <span v-if="file" class="notranslate" @click.stop="openFileDialog">
                {{ file.original_filename }}
              </span>
              <ActionLink
                v-else
                data-test="upload-link"
                :text="$tr('uploadButton')"
                @click="openFileDialog"
              />
            </VListTileTitle>
            <VListTileSubTitle v-if="file && (file.error || uploading)" data-test="status">
              <FileStatusText :checksum="file.checksum" @open="openFileDialog" />
            </VListTileSubTitle>
            <VListTileSubTitle v-else-if="file">
              {{ formatFileSize(file.file_size) }}
            </VListTileSubTitle>

          </VListTileContent>
          <VSpacer />
          <VListTileAction v-if="file">
            <VBtn
              v-if="file.error || allowFileRemove"
              icon
              class="remove-icon"
              data-test="remove"
              @click.stop="$emit('remove', file)"
            >
              <Icon color="grey">
                clear
              </Icon>
            </VBtn>
          </VListTileAction>
        </VListTile>
      </FileDropzone>
    </template>
  </Uploader>

</template>

<script>

  import FileStatusText from 'shared/views/files/FileStatusText';
  import Uploader from 'shared/views/files/Uploader';
  import { constantsTranslationMixin, fileSizeMixin, fileStatusMixin } from 'shared/mixins';
  import FileDropzone from 'shared/views/files/FileDropzone';

  export default {
    name: 'FileUploadItem',
    components: {
      Uploader,
      FileDropzone,
      FileStatusText,
    },
    mixins: [constantsTranslationMixin, fileSizeMixin, fileStatusMixin],
    props: {
      file: {
        type: Object,
        required: false,
      },
      preset: {
        type: Object,
        required: true,
        validator: preset => {
          return preset.id && preset.kind_id && preset.display;
        },
      },
      allowFileRemove: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      uploading() {
        return this.file && this.file.progress >= 1;
      },
    },
    $trs: {
      uploadButton: 'Select file',
    },
  };

</script>

<style lang="less" scoped>

  .layout .section-header {
    padding: 0 15px;
    font-weight: bold;
    color: var(--v-darken-3);
  }

  button {
    margin: 0;
  }
  /deep/ .v-list__tile {
    height: max-content !important;
    min-height: 64px;
    padding: 5px 16px;
    .remove-icon {
      display: none;
    }
    &:hover .remove-icon {
      display: block;
    }
    .v-list__tile__title {
      height: max-content;
    }
    .v-list__tile__sub-title {
      white-space: unset;
    }
  }

</style>
