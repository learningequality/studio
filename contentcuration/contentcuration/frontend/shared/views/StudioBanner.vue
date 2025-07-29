<template>

  <div
    class="banner notranslate"
    :style="{ backgroundColor: error ? $themePalette.red.v_100 : '' }"
  >
    <slot> </slot>
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
    },
    mounted() {
      const slotContent = this.$slots.default;
      const textContent = slotContent[0].text;
      if (textContent && this.error) {
        this.sendPoliteMessage(textContent);
      }
    },
  };

</script>


<style lang="scss" scoped>

  .banner {
    padding: 16px;
  }

</style>
