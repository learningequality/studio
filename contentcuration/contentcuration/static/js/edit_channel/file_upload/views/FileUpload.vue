<template>

  <div style="width: 100%;">
    <VAlert v-if="!primaryFileMapping.length" :value="true" type="error" outline icon="error">
      {{ $tr('fileError') }}
    </VAlert>
    <VLayout v-else row wrap>
      <VFlex sm12 md6 lg5 xl4>
        <p>
          <ContentNodeIcon :kind="node.kind" includeText />
        </p>
        <div class="preview-wrapper">
          <FilePreview :file="currentPreview" :nodeTitle="node.title" />
        </div>
      </VFlex>
      <VFlex sm12 md6 lg7 xl8>
        <VContainer fluid>
          <VLayout alignStart>
            <v-radio-group v-model="selected" :label="$tr('filesHeader')">
              <v-list threeLine>
                <FileUploadItem
                  v-for="item in primaryFileMapping"
                  :key="item.preset.id"
                  :file="item.file"
                  :preset="item.preset"
                  :allowFileRemove="allowFileRemove"
                  :isSelected="!!item.file && selected === item.file.id"
                  @selected="selectPreview(item.file.id)"
                  @uploading="handleUploading"
                />
              </v-list>
            </v-radio-group>
          </VLayout>
        </VContainer>
      </VFlex>
    </VLayout>
  </div>

</template>

<script>

  import _ from 'underscore';
  import { mapGetters, mapMutations } from 'vuex';
  import FilePreview from './FilePreview.vue';
  import FileUploadItem from './FileUploadItem.vue';
  import Constants from 'edit_channel/constants';
  import ContentNodeIcon from 'edit_channel/sharedComponents/ContentNodeIcon.vue';

  export default {
    name: 'FileUpload',
    components: {
      FilePreview,
      FileUploadItem,
      ContentNodeIcon,
    },
    props: {
      nodeIndex: {
        type: Number,
      },
    },
    data() {
      return {
        selected: null,
      };
    },
    computed: {
      ...mapGetters('edit_modal', ['getNode']),
      node() {
        return this.getNode(this.nodeIndex);
      },
      presets() {
        return _.filter(Constants.FormatPresets, { kind_id: this.node.kind });
      },
      allowFileRemove() {
        return (
          _.filter(this.node.files, file => !file.preset.supplementary && !file.error).length > 1
        );
      },
      currentPreview() {
        return _.findWhere(this.node.files, { id: this.selected });
      },
      primaryFileMapping() {
        return _.chain(this.presets)
          .where({ supplementary: false })
          .map(preset => {
            return {
              preset: preset,
              file: _.find(this.node.files, file => file.preset.id === preset.id),
            };
          })
          .value();
      },
    },
    mounted() {
      if (this.primaryFileMapping.length) this.selectPreview(this.primaryFileMapping[0].file.id);
    },
    methods: {
      ...mapMutations('edit_modal', { addFilesToNode: 'ADD_FILES_TO_NODE' }),
      selectPreview(fileID) {
        this.selected = fileID;
      },
      handleUploading(files) {
        this.addFilesToNode({ index: this.nodeIndex, files: files });
      },
    },
    $trs: {
      filesHeader: 'Preview Files',
      fileError: 'Invalid file type found',
    },
  };

</script>

<style lang="less" scoped>

  @import '../../../../less/global-variables.less';
  .preview-wrapper {
    padding-right: 15px;
  }

  .v-input--radio-group {
    width: 100%;
    /deep/ .v-input__control {
      width: 100%;
    }
    .v-list {
      padding: 0;
    }
  }

</style>
