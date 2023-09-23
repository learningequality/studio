<template>

  <div class="captions-tab-section">
    <div>
      <h2>
        {{ $tr('header') }}
      </h2>
    </div>

    <div v-if="!isGeneratingCaptions">
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

      <p v-if="selectedLanguage && !isGeneratingCaptions">
        <ActionLink
          :text="$tr('generateBtn')"
          @click="addCaption"
        />
      </p>
    </div>

    <button @click="logState">
      log state
    </button>

    <!-- TODO -->
    <!-- est. time, time elapsed can be good -->
    <p v-if="isGeneratingCaptions">
      {{ $tr('generating', { fileName: fileName() }) }}
      <LoadingText />
      <br>
    </p>

  </div>

</template>

<script>

  import { mapState, mapActions, mapGetters } from 'vuex';
  import LoadingText from 'shared/views/LoadingText';
  import { notSupportedCaptionLanguages } from 'shared/leUtils/TranscriptionLanguages';
  import LanguageDropdown from 'shared/views/LanguageDropdown';
  import { CaptionFile, uuid4 } from 'shared/data/resources';
  import { GENERATING } from 'shared/data/constants';

  export default {
    name: 'CaptionsTab',
    components: {
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
        isGeneratingCaptions: false,
      };
    },
    created() {
      this.updateIsGeneratingCaptions();
    },
    computed: {
      ...mapState('caption', ['captionFilesMap', 'captionCuesMap']),
      ...mapGetters('file', ['getContentNodeFiles']),
      excludedLanguages() {
        // excludeLanguages requires array of ids
        return notSupportedCaptionLanguages.map(l => l.id);
      },
      unsupportedLanguages() {
        // excludeLanguages requires array of ids
        return notSupportedCaptionLanguages.map(l => l.id);
      },
    },
    methods: {
      ...mapActions('caption', ['addCaptionFile']),
      logState() {
        console.log('nodeId ', this.nodeId);
        console.log(this.captionFilesMap[this.nodeId]);
        console.log(this.captionCuesMap[this.nodeId]);
      },
      addCaption() {
        // TODO: select the `file` with longest duration as recommended by @bjester.
        // For now just create captionFile object with default language 'en'.

        // Create a PK and watch CaptionCues model with this FK
        // for changes with dexie liveQuery

        const id = uuid4();
        const fileId = this.getContentNodeFiles(this.nodeId)[0].id;
        const language = this.selectedLanguage;
        if (!language && !fileId) return;

        this.setLoadingFlag(true);
        this.addCaptionFile({
          id: id,
          file_id: fileId,
          language: language,
          nodeId: this.nodeId,
        });

        CaptionFile.waitForCaptionCueGeneration(id).then(generatingFlag => {
          // known issue: the loading doesnt stop even loaded 
          // (means the flag is false) untill reloaded
          this.setLoadingFlag(generatingFlag)
          this.selectedLanguage = null;
          console.log('generating_flag: ', generatingFlag);
        });
      },
      fileName() {
        const name = String(this.getContentNodeFiles(this.nodeId)[0].original_filename);
        return name.split('.')[0];
      },
      updateIsGeneratingCaptions() {
        const captionFileIds = Object.keys(this.captionFilesMap[this.nodeId] || {});
        let isAnyGenerating = false;
        for (const id of captionFileIds) {
          if (this.captionFilesMap[this.nodeId][id][GENERATING] === true) {
            isAnyGenerating = true;
            break; // Exit loop if a generating flag is found
          }
        }
        this.setLoadingFlag(isAnyGenerating);
        // TODO: here set a UI like (generating "en" for this contentnode file)
        // this adds more detail to what is generating
        // by using the vuex[nodeId][id].language
      },
      setLoadingFlag(value) {
        this.isGeneratingCaptions = value;
      },
    },
    $trs: {
      header: 'Add Captions',
      generateBtn: 'Generate Captions',
      captionGenerationHelpText:
        'Select a language to automatically generate captions for this video',
      generating: 'Generating caption for file: {fileName}',
    },
  };

</script>

<style>
.btn {
  text-decoration: underline;
}

.captions-tab-section {
  vertical-align: text-top;
  margin-left: 10px;
  height: 80vh;
}
</style>
