<template>

  <KGrid class="details-row">
    <KGridItem
      :layout12="{ span: 4 }"
      :layout8="{ span: 3 }"
      :layout4="{ span: printing ? 2 : 4 }"
    >
      <div class="label-container">
        <label
          class="label-text"
          :style="{ color: $themeTokens.text }"
          :aria-describedby="definition ? `tooltip-${uniqueId}` : undefined"
        >
          {{ label }}
        </label>
        <HelpTooltip
          v-if="definition"
          class="help-icon"
          :text="definition"
          :tooltipId="`tooltip-${uniqueId}`"
        />
      </div>
    </KGridItem>
    <KGridItem
      :layout12="{ span: 8 }"
      :layout8="{ span: 5 }"
      :layout4="{ span: printing ? 2 : 4 }"
    >
      <div
        class="value-column"
        :class="{ notranslate }"
      >
        <slot>
          {{ text }}
        </slot>
      </div>
    </KGridItem>
  </KGrid>

</template>


<script>

  import HelpTooltip from '../HelpTooltip';
  import { printingMixin } from '../../mixins';

  let instanceCounter = 0;

  export default {
    name: 'StudioDetailsRow',
    components: {
      HelpTooltip,
    },
    mixins: [printingMixin],
    props: {
      label: {
        type: String,
        default: '',
      },
      definition: {
        type: String,
        default: null,
      },
      text: {
        type: String,
        default: '',
      },
      notranslate: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        uniqueId: instanceCounter++,
      };
    },
  };

</script>


<style lang="scss" scoped>

  .details-row {
    margin-bottom: 22px;
  }

  .label-container {
    position: relative;
    display: inline-block;
    padding-right: 44px; // space for the help icon
  }

  .label-text {
    font-weight: bold;
    line-height: 22px;
    vertical-align: middle;
  }

  .help-icon {
    position: absolute;
    top: -10px;
    right: 0;
  }

  .value-column {
    padding-left: 10px;
    line-height: 22px;
  }

</style>
