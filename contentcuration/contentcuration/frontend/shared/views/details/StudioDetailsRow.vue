<template>

  <div
    class="studio-details-row"
    :class="{
      'printing-mode': printing,
      small: windowIsSmall,
      medium: windowIsMedium,
      large: windowIsLarge,
    }"
  >
    <div class="label-column">
      <label
        class="label-text"
        :style="{ color: $themeTokens.text }"
        :aria-describedby="definition ? `tooltip-${_uid}` : undefined"
      >
        {{ label }}
      </label>
      <HelpTooltip
        v-if="definition"
        class="help-icon"
        :text="definition"
        :tooltipId="`tooltip-${_uid}`"
      />
    </div>
    <div
      class="value-column"
      :class="{ notranslate }"
    >
      <slot>
        {{ text }}
      </slot>
    </div>
  </div>

</template>


<script>

  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import HelpTooltip from '../HelpTooltip';
  import { printingMixin } from '../../mixins';

  export default {
    name: 'StudioDetailsRow',
    components: {
      HelpTooltip,
    },
    mixins: [printingMixin],
    setup() {
      const { windowIsSmall, windowIsMedium, windowIsLarge } = useKResponsiveWindow();
      return {
        windowIsSmall,
        windowIsMedium,
        windowIsLarge,
      };
    },
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
  };

</script>


<style lang="scss" scoped>

  .studio-details-row {
    display: grid;
    grid-template-columns: 1fr;
    gap: 8px;
    padding: 16px 0;
    word-break: break-word;

    &.medium {
      grid-template-columns: 5fr 7fr;
    }

    &.large {
      grid-template-columns: 4fr 8fr;
    }

    &.printing-mode {
      grid-template-columns: 4fr 8fr;
    }
  }

  .label-column {
    position: relative;
    display: flex;
    align-items: flex-start;
    padding-right: 44px;
  }

  .label-text {
    font-size: 14px;
    font-weight: bold;
    line-height: 20px;
    vertical-align: middle;
  }

  .help-icon {
    position: absolute;
    top: -12px;
    right: 0;
  }

  .value-column {
    padding-left: 10px;
    font-size: 14px;
    line-height: 20px;
  }

</style>
