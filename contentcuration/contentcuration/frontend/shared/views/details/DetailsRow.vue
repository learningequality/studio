<template>

  <VLayout row wrap class="my-4">
    <VFlex :xs12="!printing" :xs4="printing" :sm5="!printing" md4 xl4>
      <div class="label-container">
        <label class="body-1 font-weight-bold" :style="{ color: $vuetify.theme.darkGrey }">
          {{ label }}
        </label>
        <HelpTooltip v-if="definition" :text="definition" bottom class="mx-1" />
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
    display: flex;
    align-items: center;
  }

  label {
    vertical-align: middle;
  }

</style>
