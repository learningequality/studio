<template>

  <VBtn
    :style="{color: $vuetify.theme.primary}"
    v-bind="$attrs"
    flat
    exact
    class="action-link"
    @keyup.enter.stop="$emit('click')"
    @click.stop="$emit('click')"
  >
    <slot>
      {{ text }}
    </slot>
  </VBtn>

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

  .v-btn {
    min-width: min-content;
    height: unset;
    min-height: min-content;
    padding: 0;
    margin: 0;
    font-weight: normal;
    text-decoration: underline !important;
    text-transform: none;
  }

</style>
