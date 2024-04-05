<template>

  <div>
    <Icon
      ref="tooltip"
      :color="$themeTokens.primary"
      style="font-size:20px;"
      :icon="icon"
    />

    <KTooltip
      reference="tooltip"
      placement="bottom"
      :refs="$refs"
      v-bind="$attrs"
    >
      {{ text }}
    </KTooltip>
  </div>

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
    },
  };

</script>

<style lang="less" scoped>

  /deep/.k-tooltip {
    width: 100%;
  }

</style>
