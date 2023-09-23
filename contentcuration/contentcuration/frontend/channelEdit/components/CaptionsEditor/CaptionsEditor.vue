<template>

  <div>
    <h1>{{ message }}</h1>
  </div>

</template>

<script>
  import { mapState, mapActions } from 'vuex';
  import FileUpload from '../../views/files/FileUpload.vue';


  export default {
    name: 'ChannelEdit',
    components: {
      FileUpload
    },
    props: {},
    data() {
      return {
        message: 'Caption editor!',
      };
    },
    computed: {
      ...mapState('caption', ['captionFilesMap', 'captionCuesMap']),
    },
    methods: {},
    created() {
      // console.log(this.captionFilesMap);
      // this.loadCaptionCues(Object.keys(this.captionFilesMap));
    },
    beforeRouteEnter(to, from, next) {}
  }

</script>

<style>
  /* styles */
</style>
