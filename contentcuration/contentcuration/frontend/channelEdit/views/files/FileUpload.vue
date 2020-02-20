<template>

  <div style="width: 100%;">
    <VCard v-if="loading" flat>
      <VCardText>
        <VLayout align-center class="text-xs-center" fill-height wrap>
          <VFlex xs12>
            <VProgressCircular indeterminate color="primary" />
          </VFlex>
          <VFlex xs12 class="mt-4 title grey--text">
            {{ $tr('loadingFiles') }}
          </VFlex>
        </VLayout>
      </VCardText>
    </VCard>
    <VCard
      v-else-if="!primaryFileMapping.length || loadError"
      data-test="error"
      color="grey lighten-4"
      flat
    >
      <VCardText>
        <VLayout align-center justify-center fill-height>
          <Icon color="red">
            error
          </Icon>
          &nbsp; {{ $tr('fileError') }}
        </VLayout>
      </VCardText>
    </VCard>
    <VLayout v-else row wrap>
      <VFlex sm12 md6 lg5 xl4>
        <p>
          <ContentNodeIcon :kind="node.kind" includeText />
        </p>
        <div class="preview-wrapper">
          <FilePreview :fileId="selected" :nodeTitle="node.title" />
        </div>
      </VFlex>
      <VFlex sm12 md6 lg7 xl8>
        <VContainer fluid>
          <VLayout alignStart>
            <VRadioGroup
              v-model="selected"
              hide-details
              :label="$tr('filesHeader')"
              class="subheading"
            >
              <VList threeLine>
                <FileUploadItem
                  v-for="item in primaryFileMapping"
                  v-show="!viewOnly || item.file"
                  :key="item.preset.id"
                  :viewOnly="viewOnly"
                  :file="item.file"
                  :preset="item.preset"
                  :allowFileRemove="allowFileRemove"
                  :style="{backgroundColor:
                    viewOnly && item.file && item.file.id === selected && fileCount > 1 ?
                      $vuetify.theme.greyBackground : 'transparent'}"
                  @uploading="handleUploading"
                  @remove="handleRemoveFile"
                />
              </VList>
            </VRadioGroup>
          </VLayout>
        </VContainer>
      </VFlex>
    </VLayout>
  </div>

</template>

<script>

  import sortBy from 'lodash/sortBy';
  import { mapActions, mapGetters } from 'vuex';
  import FilePreview from './FilePreview';
  import FileUploadItem from './FileUploadItem';
  import Constants from 'edit_channel/constants';
  import ContentNodeIcon from 'shared/views/ContentNodeIcon';

  export default {
    name: 'FileUpload',
    components: {
      FilePreview,
      FileUploadItem,
      ContentNodeIcon,
    },
    props: {
      nodeId: {
        type: String,
        required: true,
      },
      viewOnly: {
        type: Boolean,
        default: true,
      },
    },
    data() {
      return {
        loading: true,
        loadError: null,
        selected: null,
      };
    },
    computed: {
      ...mapGetters('file', ['getFiles']),
      ...mapGetters('contentNode', ['getContentNode']),
      node() {
        return this.getContentNode(this.nodeId);
      },
      files() {
        return this.getFiles(this.node.files);
      },
      presets() {
        return Constants.FormatPresets.filter(p => p.kind_id === this.node.kind);
      },
      fileCount() {
        return this.primaryFileMapping.filter(item => item.file && !item.file.error).length;
      },
      allowFileRemove() {
        return !this.viewOnly && this.fileCount > 1;
      },
      primaryFileMapping() {
        return sortBy(
          this.presets
            .filter(p => !p.supplementary)
            .map(preset => {
              return {
                preset,
                order: preset.order,
                file: this.files.find(file => file.preset.id === preset.id),
              };
            }),
          'order'
        );
      },
    },
    mounted() {
      this.loading = true;
      this.loadFiles({ ids: this.node.files.join(',') })
        .then(() => {
          this.loading = false;
          this.selectFirstFile();
        })
        .catch(error => {
          this.loadError = error;
        });
    },
    methods: {
      ...mapActions('file', ['loadFiles']),
      ...mapActions('contentNode', ['addFiles', 'removeFiles']),
      selectFirstFile() {
        let firstFile = sortBy(this.files, f => f.preset.order)[0];
        this.selected = firstFile && firstFile.id;
      },
      handleUploading(file) {
        this.selected = file.id;
        this.addFiles({ id: this.nodeId, files: [file] });
      },
      handleRemoveFile(file) {
        this.removeFiles({ id: this.nodeId, files: [file] });
        if (file.id === this.selected) {
          this.selectFirstFile();
        }
      },
    },
    $trs: {
      filesHeader: 'Preview Files',
      fileError: 'Invalid file type found',
      loadingFiles: 'Loading files',
    },
  };

</script>

<style lang="less" scoped>

  .preview-wrapper {
    padding-right: 15px;
  }

  .v-input--radio-group {
    width: 100%;
    /deep/ .v-input__control {
      width: 100%;
    }
    /deep/ label {
      color: black;
    }
    .v-list {
      padding: 0;
    }
  }

</style>
