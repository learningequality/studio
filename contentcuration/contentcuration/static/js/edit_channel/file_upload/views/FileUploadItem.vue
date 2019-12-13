<template>

  <Uploader :readonly="viewOnly" :presetID="preset.id" @uploading="handleUploading">
    <template slot="upload-zone" slot-scope="uploader">
      <v-list-tile
        :style="{backgroundColor: isSelected? $vuetify.theme.greyBackground : 'transparent'}"
        @click.stop="file? $emit('selected') : uploader.openFileDialog()"
      >
        <v-list-tile-action>
          <v-radio v-if="file" :value="file.id" color="primary" />
        </v-list-tile-action>
        <v-list-tile-content>
          <v-list-tile-sub-title>{{ preset.id | translate }}</v-list-tile-sub-title>
          <v-list-tile-title>
            <span v-if="file" @click.stop="uploader.openFileDialog">
              {{ file.original_filename }}
            </span>
            <a v-else class="action-link" @click.stop="uploader.openFileDialog">
              {{ $tr('uploadButton') }}
            </a>
          </v-list-tile-title>
          <v-list-tile-sub-title v-if="file && file.error">
            {{ statusMessage([file.id]) }}
            &nbsp;
            <a
              v-if="file.error.type !== 'NO_STORAGE'"
              class="action-link"
              @click.stop="uploader.openFileDialog"
            >
              {{ $tr('uploadButton') }}
            </a>
          </v-list-tile-sub-title>
          <v-list-tile-sub-title v-else-if="file && uploading">
            {{ statusMessage([file.id]) }}
          </v-list-tile-sub-title>
          <v-list-tile-sub-title v-else-if="file">
            {{ formatFileSize(file.file_size) }}
          </v-list-tile-sub-title>

        </v-list-tile-content>
        <VSpacer />
        <v-list-tile-action v-if="file">
          <v-btn
            v-if="allowFileRemove"
            icon
            class="remove-icon"
            @click.stop="$emit('remove', file.id)"
          >
            <v-icon color="grey">
              clear
            </v-icon>
          </v-btn>
        </v-list-tile-action>
      </v-list-tile>
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
        default: false,
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
