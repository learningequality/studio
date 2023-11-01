<template>

  <div class="captions-tab-section">
    <div class="my-4 px-4 title">
      <ContentNodeIcon
        v-if="node && node.kind"
        :kind="node.kind"
        class="mr-1"
      />
      <h2
        v-if="node && node.title"
        class="headline mx-2 notranslate"
        data-test="title"
      >
        {{ $tr('header', { fileName: node.title }) }}
      </h2>
    </div>

    <div v-if="!isGeneratingCaptions" class="mb-2 mt-2 px-4">
      <p class="my-2">
        {{ $tr('captionGenerationHelpText') }}
      </p>

      <LanguageDropdown
        ref="language"
        v-model="selectedLanguage"
        clearable
        :required="true"
        :excludeLanguages="excludedLanguages"
      />

      <VBtn
        v-if="selectedLanguage && !isGeneratingCaptions"
        flat
        color="primary"
        class="font-weight-bold ml-0"
        @click="addCaption"
      >
        {{ $tr('generateBtn') }}
      </VBtn>
    </div>
    <!-- TODO -->
    <!-- est. time, time elapsed can be good -->
    <p v-if="isGeneratingCaptions">
      {{ $tr('generating', { fileName: node.title }) }}
      <LoadingText />
      <br>
    </p>

  </div>

</template>

<script>

  import { mapActions, mapGetters } from 'vuex';
  import { CaptionFile, uuid4 } from 'shared/data/resources';
  import { notSupportedCaptionLanguages } from 'shared/leUtils/TranscriptionLanguages';
  import ContentNodeIcon from 'shared/views/ContentNodeIcon';
  import LoadingText from 'shared/views/LoadingText';
  import LanguageDropdown from 'shared/views/LanguageDropdown';

  export default {
    name: 'CaptionsTab',
    components: {
      ContentNodeIcon,
      LanguageDropdown,
      LoadingText,
    },
    props: {
      nodeId: {
        type: String,
        required: true,
      },
    },
    data() {
      return {
        selectedLanguage: null,
      };
    },
    computed: {
      ...mapGetters('contentNode', ['getContentNode']),
      ...mapGetters('caption', ['isGeneratingGetter']),
      ...mapGetters('file', ['getContentNodeFiles']),
      // ...mapState('caption', ['captionFilesMap', 'captionCuesMap']),
      node() {
        return this.getContentNode(this.nodeId);
      },
      excludedLanguages() {
        // excludeLanguages requires array of ids
        return notSupportedCaptionLanguages.map(l => l.id);
      },
      isGeneratingCaptions() {
        return this.isGeneratingGetter(this.nodeId);
      },
    },
    methods: {
      ...mapActions('caption', ['addCaptionFile']),
      addCaption() {
        const id = uuid4();
        const fileId = this.getLongestDurationFileId();
        const language = this.selectedLanguage;
        if (!language && !fileId) return;

        this.addCaptionFile({
          id: id,
          file_id: fileId,
          language: language,
          nodeId: this.nodeId,
        });

        CaptionFile.waitForCaptionCueGeneration(id).then(() => {
          this.selectedLanguage = null;
        });
      },
      getLongestDurationFileId() {
        const files = this.getContentNodeFiles(this.nodeId);
        const { id } = files.reduce((max, file) => (file.duration > max.duration ? file : max), {
          duration: 0,
        });
        return id;
      },
    },
    $trs: {
      header: 'Add Captions for {fileName}',
      generateBtn: 'Generate Captions',
      captionGenerationHelpText:
        'Select a language to automatically generate captions for this video',
      generating: 'Generating caption for file: {fileName}',
    },
  };

</script>

<style lang="less" scoped>

  .captions-tab-section {
    height: 80vh;
    vertical-align: text-top;
  }

  .title {
    display: inline-flex;
    align-items: center;
    justify-content: flex-start;
  }

</style>
