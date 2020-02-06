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
          <VListTileTitle v-else-if="uploading" class="grey--text">
            {{ $tr('uploadingFileText') }}
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
              {{ uploadStatus }}
            </span>
            <span v-else>
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

  import Uploader from 'edit_channel/sharedComponents/Uploader';
  import ActionLink from 'edit_channel/sharedComponents/ActionLink';
  import { fileSizeMixin, fileStatusMixin } from 'edit_channel/file_upload/mixins';

  export default {
    name: 'SupplementaryItem',
    components: {
      Uploader,
      ActionLink,
    },
    mixins: [fileSizeMixin, fileStatusMixin],
    props: {
      file: {
        type: Object,
        validator: value => {
          // File must have a language specified
          return value.language;
        },
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
      uploading() {
        return this.file.progress < 100;
      },
      uploadStatus() {
        return this.statusMessage([this.file.id]);
      },
    },
    methods: {
      handleUploading(files) {
        files[0].language = this.file.language;
        this.$emit('uploading', files[0]);
      },
    },
    $trs: {
      languageText: '{language} ({code})',
      uploadingFileText: 'Uploading file',
    },
  };

</script>

<style lang="less" scoped>

  .v-icon {
    font-size: 14pt;
    vertical-align: middle;
  }

</style>
