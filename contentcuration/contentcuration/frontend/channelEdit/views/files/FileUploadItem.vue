<template>

  <Uploader :readonly="viewOnly" :presetID="preset.id" @uploading="handleUploading">
    <template #default="{openFileDialog}">
      <VListTile
        data-test="list-item"
        v-bind="$attrs"
        @click.stop="viewOnly? $emit('selected') : openFileDialog()"
      >
        <VListTileAction v-show="!viewOnly" @click.stop="$emit('selected')">
          <VRadio
            v-if="file"
            :key="file.id"
            :value="file.id"
            color="primary"
            data-test="radio"
          />
        </VListTileAction>
        <VListTileContent>
          <VListTileSubTitle>{{ preset.id | translate }}</VListTileSubTitle>
          <VListTileTitle>
            <span v-if="file && viewOnly" class="notranslate">
              {{ file.original_filename }}
            </span>
            <span v-else-if="file" class="notranslate" @click.stop="openFileDialog">
              {{ file.original_filename }}
            </span>
            <ActionLink
              v-else-if="!viewOnly"
              data-test="upload-link"
              :text="$tr('uploadButton')"
              @click="openFileDialog"
            />
          </VListTileTitle>
          <VListTileSubTitle v-if="file && (file.error || uploading)" data-test="status">
            <FileStatusText :fileIds="[file.id]" :readonly="viewOnly" @open="openFileDialog" />
          </VListTileSubTitle>
          <VListTileSubTitle v-else-if="file">
            {{ formatFileSize(file.file_size) }}
          </VListTileSubTitle>

        </VListTileContent>
        <VSpacer />
        <VListTileAction v-if="file && !viewOnly">
          <VBtn
            v-if="(file.error && !viewOnly) || allowFileRemove"
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
    </template>
  </Uploader>

</template>

<script>

  import { mapGetters } from 'vuex';
  import { fileSizeMixin, fileStatusMixin } from './mixins';
  import Uploader from './Uploader';
  import FileStatusText from './FileStatusText';
  import ActionLink from 'edit_channel/sharedComponents/ActionLink';
  import { translate } from 'edit_channel/utils/string_helper';

  export default {
    name: 'FileUploadItem',
    components: {
      Uploader,
      ActionLink,
      FileStatusText,
    },
    filters: {
      translate(text) {
        return translate(text);
      },
    },
    mixins: [fileSizeMixin, fileStatusMixin],
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
      viewOnly: {
        type: Boolean,
        default: true,
      },
    },
    computed: {
      ...mapGetters('file', ['getProgress']),
      uploading() {
        if (this.file) {
          let progress = this.getProgress([this.file.id]);
          return progress.total !== progress.uploaded;
        }
        return false;
      },
    },
    methods: {
      handleUploading(files) {
        if (files.length) this.$emit('uploading', files[0]);
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
