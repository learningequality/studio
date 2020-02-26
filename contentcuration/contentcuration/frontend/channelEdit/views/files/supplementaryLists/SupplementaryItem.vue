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
          <VListTileTitle v-if="readonly">
            {{ file.original_filename }}
          </VListTileTitle>
          <VListTileTitle v-if="file.error">
            <FileStatusText :fileIds="[file.id]" @open="openFileDialog" />
          </VListTileTitle>
          <VListTileTitle v-else>
            <ActionLink
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
            <span v-if="uploading">
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
  import { fileSizeMixin } from '../mixins';
  import FileStatusText from '../FileStatusText';
  import Uploader from 'frontend/channelEdit/views/files/Uploader';
  import ActionLink from 'edit_channel/sharedComponents/ActionLink';
  import Constants from 'edit_channel/constants/index';

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
        return Constants.Languages.find(l => l.id === this.languageId);
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
