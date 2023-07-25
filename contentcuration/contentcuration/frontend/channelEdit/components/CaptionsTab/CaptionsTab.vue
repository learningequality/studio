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
  import { uuid4 } from 'shared/data/resources'

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
        languages: {
          "en": "en",
          "hn": "hn"
        }
      };
    },
    computed: {
      ...mapState('caption', ['captionFilesMap', 'captionCuesMap']),
      ...mapGetters('file', ['getContentNodeFiles']),
      noCaptions() {
        return (
          this.captionFilesMap[this.nodeId] && 
          this.captionFilesMap[this.nodeId].length > 0 
            ? false
            : true
          );
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
        const captionFile = {
          id: uuid4(),
          file_id: this.getContentNodeFiles(this.nodeId)[0].id,
          language: this.selectedLanguage === 'default' ? 'en': this.selectedLanguage
        }
        this.addCaptionFile({ nodeId: this.nodeId, captionFile: captionFile }); 
      },
    },
    created() {
      console.log(this);
    }
  }

</script>

<style>
  .btn {
    text-decoration: underline;
  }
</style>
