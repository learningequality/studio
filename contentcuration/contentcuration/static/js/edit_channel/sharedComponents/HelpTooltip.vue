<template>

  <VTooltip maxWidth="150px" v-bind="$attrs">
    <VIcon slot="activator" color="primary">
      {{ icon }}
    </VIcon>
    <span>{{ text }}</span>
  </VTooltip>

</template>

<script>

  export default {
    name: 'HelpTooltip',
    props: {
      text: {
        type: String,
        required: true,
      },
      icon: {
        type: String,
        default: 'help_outline',
      },
    },
  };

</script>

<style lang="less">

  @import '../../../less/global-variables.less';

  .v-tooltip .v-icon {
    cursor: pointer;
  }

  .v-tooltip__content {
    font-family: @font-family;
    text-align: center;
  }

</style>
