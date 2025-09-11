<template>

  <VContainer fluid>
    <VLayout
      wrap
      align-center
      justify-center
      class="file-upload-wrapper"
    >
      <VSpacer />
      <VFlex
        xs12
        md6
      >
        <FileStorage showProgress />
      </VFlex>
      <VFlex xs12>
        <VCard
          flat
          style="height: 100%; border: 1px solid lightgrey"
        >
          <FileDropzone
            :fill="true"
            @dropped="handleFiles"
          >
            <VLayout
              align-center
              fill-height
            >
              <VCardText class="align-center text-center text-xs-center">
                <p class="grey--text subheading">
                  {{ $tr('uploadToText', { title: uploadToTitle }) }}
                </p>
                <p class="mb-4 title">
                  {{ $tr('dropHereText') }}
                </p>
                <KButton
                  :text="$tr('chooseFilesButton')"
                  :primary="true"
                  data-test="upload"
                  @click="openFileDialog"
                />

                <p class="grey--text mt-2 small text-center">
                  {{ $tr('acceptsHelp', { extensions: acceptedFiles }) }}
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
  import { titleMixin } from 'shared/mixins';

  const acceptedFiles = uniq(
    FormatPresetsList.filter(p => !p.supplementary && p.display).flatMap(p => p.allowed_formats),
  );

  export default {
    name: 'FileUploadDefault',
    components: {
      FileDropzone,
      FileStorage,
    },
    mixins: [titleMixin],
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
      uploadToTitle() {
        return this.getTitle({ title: this.parentTitle });
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


<style lang="scss" scoped>

  ::v-deep .v-card {
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
