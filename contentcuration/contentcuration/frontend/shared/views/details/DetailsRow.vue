<template>

  <VLayout row wrap class="my-4">
    <VFlex xs12 sm5 md4 xl4>
      <label class="font-weight-bold body-1" :style="{color: $vuetify.theme.darkGrey}">
        {{ label }}
        <HelpTooltip v-if="definition" :text="definition" bottom />
      </label>
    </VFlex>
    <VFlex xs12 sm7 md8 xl8>
      <slot>
        {{ text }}
      </slot>
    </VFlex>
  </VLayout>

</template>

<script>

  import HelpTooltip from 'shared/views/HelpTooltip';

  export default {
    name: 'DetailsRow',
    components: {
      HelpTooltip,
    },
    props: {
      label: {
        type: String,
      },
      definition: {
        type: String,
      },
      text: {
        type: String,
      },
    },
  };

</script>


<style lang="less" scoped>

  .flex:last-child {
    padding-left: 10px;
  }
  label {
    vertical-align: middle;
  }

</style>
