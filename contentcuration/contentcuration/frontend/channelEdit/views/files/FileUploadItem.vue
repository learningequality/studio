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
          @click.stop="$emit('selected')"
        >
          <VListTileAction>
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
              <ActionLink
                v-if="file"
                class="notranslate"
                :text="file.original_filename"
                @click="openFileDialog"
              />
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
            <div v-if="file.error || allowFileRemove" class="remove-icon">
              <IconButton
                icon="clear"
                color="grey"
                :text="$tr('removeFileButton')"
                data-test="remove"
                @click="$emit('remove', file)"
              />
            </div>
          </VListTileAction>
        </VListTile>
      </FileDropzone>
    </template>
  </Uploader>

</template>

<script>

  import FileStatusText from 'shared/views/files/FileStatusText';
  import Uploader from 'shared/views/files/Uploader';
  import IconButton from 'shared/views/IconButton';
  import { constantsTranslationMixin, fileSizeMixin, fileStatusMixin } from 'shared/mixins';
  import FileDropzone from 'shared/views/files/FileDropzone';

  export default {
    name: 'FileUploadItem',
    components: {
      Uploader,
      FileDropzone,
      FileStatusText,
      IconButton,
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
        return this.file && this.file.uploading;
      },
    },
    $trs: {
      uploadButton: 'Select file',
      removeFileButton: 'Remove',
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
