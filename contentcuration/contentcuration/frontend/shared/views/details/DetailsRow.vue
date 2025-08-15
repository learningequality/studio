<template>

  <VLayout
    row
    wrap
    class="my-4"
  >
    <VFlex
      :xs12="!printing"
      :xs4="printing"
      :sm5="!printing"
      md4
      xl4
    >
      <div class="label-container">
        <label
          class="body-1 font-weight-bold"
          :style="{ color: $vuetify.theme.darkGrey }"
          :aria-describedby="`tooltip-${_uid}`"
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
    </VFlex>
    <VFlex
      :xs12="!printing"
      :xs8="printing"
      :sm7="!printing"
      md8
      xl8
      :class="{ notranslate }"
    >
      <slot>
        {{ text }}
      </slot>
    </VFlex>
  </VLayout>

</template>


<script>

  import HelpTooltip from 'shared/views/HelpTooltip';
  import { printingMixin } from 'shared/mixins';

  export default {
    name: 'DetailsRow',
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

  .flex {
    word-break: break-word;
  }

  .flex:last-child {
    padding-left: 10px;
  }

  .label-container {
    position: relative;
    display: inline-block;
    padding-right: 44px; // space for the help icon
  }

  .help-icon {
    position: absolute;
    top: -12px;
    right: 0;
  }

  label {
    vertical-align: middle;
  }

</style>
