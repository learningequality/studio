<template>

  <div>
    <Icon
      ref="tooltip"
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

  import Icon from 'shared/views/Icon.vue';

  export default {
    name: 'HelpTooltip',
    components: {
      Icon,
    },
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
