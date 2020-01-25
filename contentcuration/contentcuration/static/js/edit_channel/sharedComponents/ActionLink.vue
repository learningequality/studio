<template>

  <a
    :style="{color: $vuetify.theme.primary}"
    v-bind="$attrs"
    @click.stop="$emit('click')"
  >
    <slot>
      {{ text }}
    </slot>
  </a>

</template>
<script>

  export default {
    name: 'ActionLink',
    props: {
      text: {
        type: String,
      },
    },
  };

</script>
<style lang="less" scoped>

  a,
  a:hover {
    text-decoration: underline !important;
  }

</style>
