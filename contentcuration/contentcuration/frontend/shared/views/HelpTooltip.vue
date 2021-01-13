<template>

  <VTooltip maxWidth="150px" v-bind="$attrs">
    <Icon slot="activator" color="primary" :small="small">
      {{ icon }}
    </Icon>
    <span class="text-xs-center">{{ text }}</span>
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
        default: 'info',
      },
      small: {
        type: Boolean,
        default: true,
      },
    },
  };

</script>

<style lang="less" scoped>

  .v-icon {
    cursor: pointer;
  }

</style>
