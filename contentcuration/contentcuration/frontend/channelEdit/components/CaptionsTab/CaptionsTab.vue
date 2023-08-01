<template>

  <div class="captions-tab-section" >
    <h1>{{ message }}</h1>
    <div v-if="noCaptions" >
      <button class="btn" @click="addCaption" >
        Generate captions for [video name]
        in language
      </button>
      <LanguageDropdown
        class="mb-2"
        ref="language"
        clearable
        :placeholder="getPlaceholder('language')"
        :required=true
        :excludeLanguages="unsupportedLanguages"
      />
    </div>
  </div>

</template>

<script>
  import { mapState, mapActions, mapGetters } from 'vuex';
  import { notSupportedCaptionLanguages } from 'shared/leUtils/TranscriptionLanguages';
  import LanguageDropdown from 'shared/views/LanguageDropdown';

  export default {
    name: 'CaptionsTab',
    components: {
      LanguageDropdown,
    },
    props: {
      nodeId: {
        type: String,
        required: true,
      },
    },
    data() {
      return {
        message: 'Caption Editor',
      };
    },
    computed: {
      ...mapState('caption', ['captionFilesMap', 'captionCuesMap']),
      ...mapGetters('file', ['getContentNodeFiles']),
      noCaptions() {
        return !this.captionFilesMap[this.nodeId] || this.captionFilesMap[this.nodeId].length === 0;
      },
      unsupportedLanguages() {
        // excludeLanguages requires array of ids
        return notSupportedCaptionLanguages.map(l => l.id);
      },
    },
    methods: {
      ...mapActions('caption', ['addCaptionFile']),
      addCaption() {
        // TODO: select the `file` with longest duration as recommended by @bjester.
        // For now just create captionFile object with default language 'en'.
        const fileId = this.getContentNodeFiles(this.nodeId)[0].id;
        const language = this.selectedLanguage === 'default' ? 'en': this.selectedLanguage;

        this.addCaptionFile({
          file_id: fileId,
          language,
          nodeId: this.nodeId,
        });
      },
      getPlaceholder(_field) {
        return 'Select a language to generate captions'
      },
    }
  }

</script>

<style>

  .btn {
    text-decoration: underline;
  }
  .captions-tab-section {
    height: 80vh;
  }
  
</style>
