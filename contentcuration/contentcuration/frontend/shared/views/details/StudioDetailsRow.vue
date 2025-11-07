<template>

  <div
    class="studio-details-row"
    :class="{ 'printing-mode': printing }"
  >
    <div class="label-column">
      <label
        class="label-text"
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

  import HelpTooltip from '../HelpTooltip';
  import { printingMixin } from '../../mixins';

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
  };

</script>


<style lang="scss" scoped>

  .studio-details-row {
    display: grid;
    grid-template-columns: 1fr;
    gap: 8px;
    padding: 16px 0;
    word-break: break-word;

    @media (min-width: 600px) {
      grid-template-columns: 5fr 7fr;
    }

    @media (min-width: 960px) {
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
    font-weight: bold;
    font-size: 14px;
    line-height: 20px;
    color: var(--v-darkGrey-base, #424242);
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
