<template>

  <VContainer fluid>
    <VLayout wrap align-center justify-center class="file-upload-wrapper">
      <VSpacer />
      <VFlex xs12 md6>
        <FileStorage showProgress />
      </VFlex>
      <VFlex xs12>
        <VCard flat style="border: 1px solid lightgrey; height: 100%;">
          <Uploader fill allowMultiple @uploading="handleUploading">
            <template #default="{openFileDialog, handleFiles}">
              <FileDropzone @dropped="handleFiles" :fill="true">
                <VLayout align-center fill-height>
                  <VCardText class="text-center align-center text-xs-center">
                    <p class="subheading grey--text">
                      {{ $tr('uploadToText', {title: parentTitle}) }}
                    </p>
                    <p class="title mb-4">
                      {{ $tr('dropHereText') }}
                    </p>
                    <VBtn color="primary" @click="openFileDialog">
                      {{ $tr('chooseFilesButton') }}
                    </VBtn>
                    <p class="small text-center grey--text mt-2">
                      {{ $tr('acceptsHelp', {extensions: acceptedFiles}) }}
                    </p>
                  </VCardText>
                </VLayout>
              </FileDropzone>
            </template>
          </Uploader>
        </VCard>
      </VFlex>
    </VLayout>
  </VContainer>

</template>

<script>

  import uniq from 'lodash/uniq';
  import FileStorage from 'shared/views/files/FileStorage';
  import Uploader from 'shared/views/files/Uploader';
  import FileDropzone from 'shared/views/files/FileDropzone';
  import { FormatPresetsList } from 'shared/leUtils/FormatPresets';

  const acceptedFiles = uniq(
    FormatPresetsList.filter(p => !p.supplementary && p.display).flatMap(p => p.allowed_formats)
  );

  export default {
    name: 'FileUploadDefault',
    components: {
      Uploader,
      FileDropzone,
      FileStorage,
    },
    props: {
      parentTitle: {
        type: String,
        required: true,
      },
    },
    computed: {
      acceptedFiles() {
        return acceptedFiles.join(' • ');
      },
    },
    methods: {
      handleUploading(files) {
        this.$emit('uploading', files);
      },
    },
    $trs: {
      acceptsHelp: 'Accepts {extensions}',
      uploadToText: "Upload to '{title}'",
      dropHereText: 'Drag and drop your files here, or select your files manually',
      chooseFilesButton: 'Select Files',
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
