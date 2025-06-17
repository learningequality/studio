<template>

  <div
    v-if="show"
    class="notranslate studio-banner"
    :style="backgroundColorStyle"
    role="alert"
  >
    <slot>{{ text }}</slot>
  </div>

</template>


<script>

  import { computed, watch } from 'vue';
  import useKLiveRegion from 'kolibri-design-system/lib/composables/useKLiveRegion';

  export default {
    name: 'StudioBanner',
    setup(props, { attrs }) {
      const { announce } = useKLiveRegion();

      watch(
        () => props.show,
        newVal => {
          if (newVal) {
            announce(props.text, {
              politeness: props.error ? 'assertive' : 'polite',
            });
          }
        },
      );

      const backgroundColorStyle = computed(() => {
        return {
          backgroundColor: props.error ? attrs.$themePalette?.red?.v_100 || '#ffdddd' : 'inherit',
        };
      });

      return {
        backgroundColorStyle,
      };
    },
    props: {
      show: {
        type: Boolean,
        required: true,
      },
      text: {
        type: String,
        default: '',
      },
      error: {
        type: Boolean,
        default: false,
      },
    },
  };

</script>


<style lang="scss" scoped>

  .studio-banner {
    padding: 12px 16px;
  }

</style>
