<template>

  <Uploader
    :key="file.id"
    :presetID="presetID"
    :readonly="readonly"
    @uploading="newFile => $emit('uploading', newFile)"
  >
    <template #default="{openFileDialog}">
      <VListTile @click="!readonly && !uploading && openFileDialog()">
        <VListTileContent>
          <VListTileTitle>
            <span v-if="readonly || file.uploading">
              {{ file.original_filename }}
            </span>
            <FileStatusText
              v-else-if="file.error"
              :id="file.id"
              data-test="error"
              @open="openFileDialog"
            />
            <ActionLink
              v-else
              data-test="upload-file"
              :text="file.original_filename"
              @click="openFileDialog"
            />
          </VListTileTitle>
          <VListTileSubTitle>
            {{ $tr('languageText', {
              language: file.language.native_name, code: file.language.id}) }}
          </VListTileSubTitle>
        </VListTileContent>
        <VListTileContent>
          <VListTileTitle class="text-xs-right grey--text">
            <span v-if="file.uploading" data-test="uploading">
              <FileStatusText :id="file.id" />
            </span>
            <span v-else-if="!file.error">
              {{ formatFileSize(file.file_size) }}
            </span>
          </VListTileTitle>
        </VListTileContent>
        <VListTileAction v-if="!readonly">
          <VBtn icon flat data-test="remove" @click.stop="$emit('remove', file.id)">
            <Icon>
              clear
            </Icon>
          </VBtn>
        </VListTileAction>
      </VListTile>
    </template>
  </Uploader>

</template>

<script>

  import FileStatusText from 'shared/views/files/FileStatusText';
  import { fileSizeMixin } from 'shared/mixins';
  import Uploader from 'shared/views/files/Uploader';

  export default {
    name: 'SupplementaryItem',
    components: {
      Uploader,
      FileStatusText,
    },
    mixins: [fileSizeMixin],
    props: {
      file: {
        type: Object,
        required: true,
      },
      presetID: {
        type: String,
        required: true,
      },
      readonly: {
        type: Boolean,
        default: false,
      },
    },
    $trs: {
      languageText: '{language} ({code})',
    },
  };

</script>

<style lang="less" scoped>

  .v-icon {
    font-size: 14pt;
    vertical-align: middle;
  }

</style>
