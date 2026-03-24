<template>

  <button
    :class="$computedClass(buttonStyle)"
    :aria-label="ariaLabel"
    @click.stop.prevent="$emit('click')"
  >
    <HoverIcon
      outlineIcon="helpOutline"
      filledIcon="help"
      :outlineColor="$themePalette.blue.v_500"
      :filledColor="$themePalette.blue.v_500"
    />
  </button>

</template>


<script>

  import HoverIcon from './HoverIcon';

  /**
   * Displays a button with the ouline help icon
   * that smoothly transitions to the filled
   * help icon on hover.
   * Emits a 'click' event when clicked.
   **/
  export default {
    name: 'HelpButton',
    components: {
      HoverIcon,
    },
    props: {
      /**
       * Text to be used as the aria-label for the button
       **/
      ariaLabel: {
        type: String,
        required: true,
      },
    },
    computed: {
      buttonStyle() {
        return {
          ':focus': { ...this.$coreOutline },
        };
      },
    },
  };

</script>


<style lang="scss" scoped>

  button {
    display: inline-block;
  }

</style>
