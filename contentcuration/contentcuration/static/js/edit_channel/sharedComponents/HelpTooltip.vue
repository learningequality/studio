<template>
  <VTooltip
    :top="position === 'top'"
    :bottom="position === 'bottom'"
    :left="position === 'left'"
    :right="position === 'right'"
    maxWidth="150px"
  >
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
      position: {
        type: String,
        default: 'top',
        validator: function(value) {
          return _.contains(['top', 'bottom', 'left', 'right'], value);
        },
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
