<template>

  <VContainer fluid fill-height>
    <VLayout wrap align-center justify-center class="file-upload-wrapper">
      <VSpacer />
      <VFlex xs12 md6>
        <FileStorage showProgress />
      </VFlex>
      <VFlex xs12>
        <VCard flat height="100%">
          <Uploader allowMultiple @uploading="createNodesFromFiles">
            <template slot="upload-zone" slot-scope="uploader">
              <VLayout align-center fill-height>
                <VCardText class="text-center align-center text-xs-center">
                  <p v-if="currentNode" class="title upload-to-text">
                    {{ $tr('uploadToText', {title: currentNode.title}) }}
                  </p>
                  <p class="headline">
                    {{ $tr('dropHereText') }}
                  </p>
                  <br>
                  <div class="title">
                    {{ $tr('orText') }}
                  </div>
                  <br>
                  <VBtn color="primary" depressed @click="uploader.openFileDialog">
                    {{ $tr('chooseFilesButton') }}
                  </VBtn>
                  <p class="small text-center accepts-text">
                    {{ $tr('acceptsHelp', {extensions: acceptedFiles}) }}
                  </p>
                </VCardText>
              </VLayout>
            </template>
          </Uploader>
        </VCard>
      </VFlex>
    </VLayout>
  </VContainer>

</template>

<script>

  import _ from 'underscore';
  import { mapMutations } from 'vuex';
  import FileStorage from './FileStorage.vue';
  import Uploader from 'edit_channel/sharedComponents/Uploader.vue';
  import Constants from 'edit_channel/constants/index';
  import State from 'edit_channel/state';

  export default {
    name: 'FileUploadDefault',
    components: {
      Uploader,
      FileStorage,
    },
    computed: {
      acceptedFiles() {
        return _.chain(Constants.FormatPresets)
          .where({ supplementary: false, display: true })
          .pluck('allowed_formats')
          .flatten()
          .uniq()
          .value()
          .join(', ');
      },
      currentNode() {
        return State.currentNode;
      },
    },
    methods: {
      ...mapMutations('edit_modal', { createNodesFromFiles: 'ADD_NODES_FROM_FILES' }),
    },
    $trs: {
      acceptsHelp: 'Accepts {extensions}',
      uploadToText: "Upload to '{title}'",
      dropHereText: 'Drag and drop your files here',
      orText: 'or',
      chooseFilesButton: 'Choose Files',
    },
  };

</script>

<style lang="less" scoped>

  @import '../../../../less/global-variables.less';
  /deep/ .v-card {
    position: relative;
    min-height: 50vh;
    margin-top: 20px;
    overflow: hidden;
    border: 1px solid @gray-300 !important;
  }

  /deep/ .uploader {
    position: absolute;
  }
  .file-upload-wrapper {
    max-width: 900px;
    margin: 0 auto;
  }

  .title,
  .headline {
    font-family: @font-family !important;
  }
  .accepts-text,
  .upload-to-text {
    color: @gray-700;
  }

  .accepts-text {
    margin-top: 10px;
  }

</style>
