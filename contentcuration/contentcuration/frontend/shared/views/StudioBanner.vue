<template>

  <div
    class="banner notranslate"
    data-testid="studio-banner"
    :style="{ backgroundColor: error ? $themePalette.red.v_100 : '' }"
  >
    {{ errorText }}
  </div>

</template>


<script>

  import useKLiveRegion from 'kolibri-design-system/lib/composables/useKLiveRegion';

  export default {
    name: 'StudioBanner',
    setup() {
      const { sendPoliteMessage } = useKLiveRegion();
      return { sendPoliteMessage };
    },
    props: {
      error: {
        type: Boolean,
        default: false,
      },
      errorText: {
        type: String,
        default: '',
      }
    },
    watch: {
      errorText(newText) {
        if (newText.length && this.error) {
          this.sendPoliteMessage(newText);
        }
      },
    },
    mounted() {
      if (this.errorText.length && this.error) {
        this.sendPoliteMessage(this.errorText);
      }
    },
  };

</script>


<style lang="scss" scoped>

  .banner {
    padding: 16px;
  }

</style>
