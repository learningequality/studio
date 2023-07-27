<template>

  <div>
    <h1>{{ message }}</h1>
    <div v-if="noCaptions" >
      <button class="btn" @click="addCaption" >
        Generate captions for [video name]
        in language
      </button>
      <select v-model="selectedLanguage">
        <option v-for="lang in languages">{{ lang }}</option>
      </select>
    </div>
    <button @click="mapLog">
      log
    </button>
  </div>

</template>

<script>
  import { mapState, mapActions, mapGetters } from 'vuex';
  import { CAPTIONS_LANGUAGES as LANGUAGES } from './languages';

  export default {
    name: 'CaptionsTab',
    components: {},
    props: {
      nodeId: {
        type: String,
        required: true,
      },
    },
    data() {
      return {
        message: 'Caption Editor',
        selectedLanguage: 'default',
        languages: LANGUAGES,
      };
    },
    computed: {
      ...mapState('caption', ['captionFilesMap', 'captionCuesMap']),
      ...mapGetters('file', ['getContentNodeFiles']),
      noCaptions() {
        return !this.captionFilesMap[this.nodeId] || this.captionFilesMap[this.nodeId].length === 0;
      },
    },
    methods: {
      ...mapActions('caption', ['addCaptionFile']),
      mapLog() {
        console.log(this.captionFilesMap);
      },
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
    }
  }

</script>

<style>
  .btn {
    text-decoration: underline;
  }
</style>
