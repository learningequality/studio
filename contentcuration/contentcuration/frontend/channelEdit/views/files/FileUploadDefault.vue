<template>

  <VContainer fluid>
    <VLayout wrap align-center justify-center class="file-upload-wrapper">
      <VSpacer />
      <VFlex xs12 md6>
        <FileStorage showProgress />
      </VFlex>
      <VFlex xs12>
        <VCard flat style="border: 1px solid lightgrey; height: 100%;">
          <FileDropzone :fill="true" @dropped="handleFiles">
            <VLayout align-center fill-height>
              <VCardText class="text-center align-center text-xs-center">
                <p class="subheading grey--text">
                  {{ $tr('uploadToText', {title: parentTitle}) }}
                </p>
                <p class="title mb-4">
                  {{ $tr('dropHereText') }}
                </p>
                <VBtn color="primary" data-test="upload" @click="openFileDialog">
                  {{ $tr('chooseFilesButton') }}
                </VBtn>
                <p class="small text-center grey--text mt-2">
                  {{ $tr('acceptsHelp', {extensions: acceptedFiles}) }}
                </p>
              </VCardText>
            </VLayout>
          </FileDropzone>
        </VCard>
      </VFlex>
    </VLayout>
  </VContainer>

</template>

<script>

  import uniq from 'lodash/uniq';
  import FileStorage from 'shared/views/files/FileStorage';
  import FileDropzone from 'shared/views/files/FileDropzone';
  import { FormatPresetsList } from 'shared/leUtils/FormatPresets';

  const acceptedFiles = uniq(
    FormatPresetsList.filter(p => !p.supplementary && p.display).flatMap(p => p.allowed_formats)
  );

  export default {
    name: 'FileUploadDefault',
    components: {
      FileDropzone,
      FileStorage,
    },
    props: {
      parentTitle: {
        type: String,
        required: true,
      },

      // Methods from uploader component
      handleFiles: {
        type: Function,
        required: true,
      },
      openFileDialog: {
        type: Function,
        required: true,
      },
    },
    computed: {
      acceptedFiles() {
        // TODO: handle lists for i18n
        return acceptedFiles.join(', ');
      },
    },
    $trs: {
      acceptsHelp: 'Supported file types: {extensions}',
      uploadToText: "Upload to '{title}'",
      dropHereText: 'Drag and drop your files here, or select your files manually',
      chooseFilesButton: 'Select files',
    },
  };

</script>

<style lang="less" scoped>

  /deep/ .v-card {
    position: relative;
    min-height: 50vh;
    margin-top: 20px;
    overflow: hidden;
  }

  .uploader {
    position: absolute;
  }
  .file-upload-wrapper {
    max-width: 900px;
    margin: 0 auto;
  }

</style>
