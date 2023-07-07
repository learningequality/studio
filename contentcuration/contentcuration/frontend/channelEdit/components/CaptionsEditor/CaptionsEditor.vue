<template>

  <div>
    <h1>{{ message }}</h1>
  </div>

</template>

<script>

  export default {
    data() {
      return {
        message: 'Caption editor!',
      };
    },
    mounted() {
      this.$store.dispatch('captionFiles/loadCaptionFiles');
    },
  };

</script>

<style>
  /* styles */
</style>
