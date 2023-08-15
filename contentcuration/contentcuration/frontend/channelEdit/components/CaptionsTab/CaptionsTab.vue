<template>
  <div class="captions-tab-section">
    <!-- Heading -->
    <div>
      <h2>
        {{ $tr('header') }}
      </h2>
    </div>

    <!-- If backend not generating caption cues -->
    <div v-if="!isGeneratingCaptions">
      <p class="my-2">
        {{ $tr('captionGenerationHelpText') }}
      </p>

      <!-- Language Selection Dropdown-->
      <LanguageDropdown ref="language"
                        clearable
                        v-model="selectedLanguage"
                        :required=true
                        :excludeLanguages="excludedLanguages" />

      <!-- Generate Caption Buttons -->
      <p v-if="selectedLanguage && !isGeneratingCaptions">
        <ActionLink :text="$tr('generateBtn')"
                    @click="addCaption" />
      </p>
    </div>

    <button @click="logState">
      log state
    </button>

    <!-- TODO -->
    <!-- est. time, time elapsed can be good -->
    <p v-if="isGeneratingCaptions">
      {{ $tr('generating', { fileName: fileName() }) }}
      <br />
      {{ $tr('timeElasped', { elaspedTime: elaspedTime() }) }}
      <LoadingText />
      <br />
    </p>

  </div>
</template>

<script>
import LoadingText from 'shared/views/LoadingText';
import { mapState, mapActions, mapGetters } from 'vuex';
import { notSupportedCaptionLanguages } from 'shared/leUtils/TranscriptionLanguages';
import LanguageDropdown from 'shared/views/LanguageDropdown';
import { CaptionFile } from 'shared/data/resources'
import { uuid4 } from 'shared/data/resources';

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
  computed: {
    ...mapState('caption', ['captionFilesMap', 'captionCuesMap']),
    ...mapGetters('file', ['getContentNodeFiles']),
    excludedLanguages() {
      // excludeLanguages requires array of ids
      return notSupportedCaptionLanguages.map(l => l.id);
    },
  },
  methods: {
    ...mapActions('caption', ['addCaptionFile']),
    logState() {
      console.log("nodeId ", this.nodeId);
      console.log(this.captionFilesMap[this.nodeId]);
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
      this.isGeneratingCaptions = true;

      this.addCaptionFile({
        id: id,
        file_id: fileId,
        language: language,
        nodeId: this.nodeId,
      });

      CaptionFile.waitForCaptionCueGeneration(id).then(r => {
        console.log(r);
      })
    },
    fileName() {
      let name = String(this.getContentNodeFiles(this.nodeId)[0].original_filename);
      return name.split('.')[0];
    },
    elaspedTime() {
      const start = new Date();
      return '0:00'
    }
  },
  $trs: {
    header: 'Add Captions',
    generateBtn: 'Generate Captions',
    captionGenerationHelpText: 'Select a language to automatically generate captions for this video',
    generating: 'Generating caption for file: {fileName}',
    timeElasped: 'Time Elasped: {elaspedTime}',
  },
}

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
