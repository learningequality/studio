<template>

  <Uploader :readonly="viewOnly" :presetID="preset.id" @uploading="handleUploading">
    <template slot="upload-zone" slot-scope="uploader">
      <VListTile
        data-test="list-item"
        :style="{backgroundColor: isSelected? $vuetify.theme.greyBackground : 'transparent'}"
        @click.stop="viewOnly? $emit('selected') : uploader.openFileDialog()"
      >
        <VListTileAction v-show="!viewOnly" @click.stop="$emit('selected')">
          <VRadio
            v-if="file"
            :key="file.id"
            class="notranslate"
            :value="file.id"
            color="primary"
            data-test="radio"
          />
        </VListTileAction>
        <VListTileContent>
          <VListTileSubTitle>{{ preset.id | translate }}</VListTileSubTitle>
          <VListTileTitle>
            <span v-if="file" class="notranslate" @click.stop="uploader.openFileDialog">
              {{ file.original_filename }}
            </span>
            <a
              v-else
              data-test="upload-link"
              class="action-link"
              :style="{color: $vuetify.theme.primary}"
              @click.stop="uploader.openFileDialog"
            >
              {{ $tr('uploadButton') }}
            </a>
          </VListTileTitle>
          <VListTileSubTitle v-if="file && file.error">
            {{ statusMessage([file.id]) }}
            &nbsp;
            <a
              v-if="file.error.type !== 'NO_STORAGE'"
              class="action-link"
              data-test="error-upload-link"
              :style="{color: $vuetify.theme.primary}"
              @click.stop="uploader.openFileDialog"
            >
              {{ $tr('uploadButton') }}
            </a>
          </VListTileSubTitle>
          <VListTileSubTitle v-else-if="file && uploading">
            {{ statusMessage([file.id]) }}
          </VListTileSubTitle>
          <VListTileSubTitle v-else-if="file">
            {{ formatFileSize(file.file_size) }}
          </VListTileSubTitle>

        </VListTileContent>
        <VSpacer />
        <VListTileAction v-if="file && !viewOnly">
          <VBtn
            v-if="allowFileRemove || file.error"
            icon
            class="remove-icon"
            data-test="remove"
            @click.stop="$emit('remove', file.id)"
          >
            <VIcon color="grey" class="notranslate">
              clear
            </VIcon>
          </VBtn>
        </VListTileAction>
      </VListTile>
    </template>
  </Uploader>

</template>

<script>

  import { mapGetters } from 'vuex';
  import { fileSizeMixin, fileStatusMixin } from '../mixins';
  import Uploader from 'edit_channel/sharedComponents/Uploader.vue';
  import { translate } from 'edit_channel/utils/string_helper';

  export default {
    name: 'FileUploadItem',
    components: {
      Uploader,
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
      },
      preset: {
        type: Object,
      },
      allowFileRemove: {
        type: Boolean,
        default: false,
      },
      viewOnly: {
        type: Boolean,
        default: true,
      },
      isSelected: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      ...mapGetters('fileUploads', ['getFile']),
      uploading() {
        return this.file && !!this.getFile(this.file.id);
      },
    },
    methods: {
      handleUploading(files) {
        this.$emit('uploading', files[0]);
      },
    },
    $trs: {
      uploadButton: 'Select file',
    },
  };

</script>

<style lang="less" scoped>

  @import '../../../../less/global-variables.less';
  .layout .section-header {
    padding: 0 15px;
    font-family: @font-family !important;
    font-weight: bold;
    color: @gray-700;
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
