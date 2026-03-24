<template>

  <span class="hover-icon">
    <KIcon
      :icon="outlineIcon"
      :color="outlineColor"
      class="outline"
    />
    <KIcon
      :icon="filledIcon"
      :color="filledColor"
      class="filled"
    />
  </span>

</template>


<script>

  /**
   * Displays an outline icon that smoothly
   * transitions to a filled icon on hover.
   *
   * Icon is 16px by default (for current
   * usages, customization is not needed).
   **/
  export default {
    name: 'HoverIcon',
    props: {
      /**
       * (`KIcon` compatible) name of the outline icon
       **/
      outlineIcon: {
        type: String,
        required: true,
      },
      /**
       * (`KIcon` compatible) name of the filled icon
       **/
      filledIcon: {
        type: String,
        required: true,
      },
      /**
       * Color for the outline icon
       **/
      outlineColor: {
        type: String,
        required: true,
      },
      /**
       * Color for the filled icon
       **/
      filledColor: {
        type: String,
        required: true,
      },
    },
  };

</script>


<style lang="scss" scoped>

  /* https://www.w3.org/TR/WCAG21/#target-size */
  $toucharea-min-width: 44px;

  .hover-icon {
    position: relative;
    display: inline-block;
    width: $toucharea-min-width;
    height: $toucharea-min-width;
    font-size: 16px;
    cursor: pointer;
  }

  .outline,
  .filled {
    position: absolute;
    top: 50%;
    left: 50%;
    transition: opacity 0.4s ease;
    transform: translate(-50%, -50%);
  }

  .filled {
    z-index: 1;
    opacity: 0;
  }

  .hover-icon:hover {
    .filled {
      opacity: 1;
    }

    .outline {
      opacity: 0;
    }
  }

</style>
