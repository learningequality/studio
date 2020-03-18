<template>

  <Uploader
    :key="file.id"
    :presetID="presetID"
    :readonly="readonly"
    @uploading="handleUploading"
  >
    <template #default="{openFileDialog}">
      <VListTile @click="!readonly && !uploading && openFileDialog()">
        <VListTileContent>
          <VListTileTitle>
            <span v-if="readonly || uploading">
              {{ file.original_filename }}
            </span>
            <FileStatusText
              v-else-if="file.error"
              data-test="error"
              :fileIds="[file.id]"
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
            <span v-if="uploading" data-test="uploading">
              <FileStatusText :fileIds="[file.id]" />
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

  import { mapGetters } from 'vuex';
  import { fileSizeMixin } from 'shared/mixins';
  import FileStatusText from '../FileStatusText';
  import Uploader from 'frontend/channelEdit/views/files/Uploader';
  import ActionLink from 'edit_channel/sharedComponents/ActionLink';
  import Languages from 'shared/leUtils/Languages';

  export default {
    name: 'SupplementaryItem',
    components: {
      Uploader,
      ActionLink,
      FileStatusText,
    },
    mixins: [fileSizeMixin],
    props: {
      fileId: {
        type: String,
        required: true,
      },
      languageId: {
        type: String,
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
    computed: {
      ...mapGetters('file', ['getFile', 'getUploadsInProgress']),
      file() {
        return this.getFile(this.fileId);
      },
      language() {
        return Languages.get(this.languageId);
      },
      uploading() {
        return this.getUploadsInProgress([this.fileId]).length;
      },
    },
    methods: {
      handleUploading(files) {
        this.$emit('uploading', {
          ...files[0],
          language: this.language,
        });
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
