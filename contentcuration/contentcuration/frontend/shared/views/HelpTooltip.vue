<template>

  <span
    ref="tooltip"
    class="help-tooltip"
  >
    <HoverIcon
      outlineIcon="infoOutline"
      filledIcon="info"
      :aria-label="text"
      :outlineColor="$themePalette.blue.v_500"
      :filledColor="$themePalette.blue.v_500"
    />
    <KTooltip
      class="tooltip"
      reference="tooltip"
      placement="bottom"
      :maxWidth="maxWidth ? maxWidth : '450px'"
      :refs="$refs"
    >
      <span :id="tooltipId">{{ text }}</span>
    </KTooltip>
  </span>

</template>


<script>

  import HoverIcon from './HoverIcon';

  /**
   * Displays the outline info icon that smoothly
   * transitions to the filled info icon on hover,
   * when a tooltip is shown.
   **/
  export default {
    name: 'HelpTooltip',
    components: {
      HoverIcon,
    },
    props: {
      /**
       * Text to be displayed in the tooltip
       **/
      text: {
        type: String,
        required: true,
      },
      /**
       * Maximum width of the tooltip.
       **/
      maxWidth: {
        type: String,
        required: false,
        default: null,
      },
      /**
       * Unique id of the tooltip element.
       **/
      tooltipId: {
        type: String,
        required: false,
        default: '',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .help-tooltip {
    display: inline-block;
  }

</style>
