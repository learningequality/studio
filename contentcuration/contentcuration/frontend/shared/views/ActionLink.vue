<template>

  <VBtn
    :style="{ color: $vuetify.theme.primary }"
    :target="target"
    :class="{ 'has-text-truncate': textTruncate }"
    v-bind="$attrs"
    flat
    exact
    @keyup.enter.stop="$emit('click')"
    @click.stop="$emit('click')"
  >
    <slot>
      <span
        :class="{ 'text-truncate': textTruncate }"
        style="text-decoration: underline;"
      >
        {{ text }}
      </span>
      <Icon v-if="target === '_blank'" small class="mx-1 rtl-flip">
        open_in_new
      </Icon>
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
      target: {
        type: String,
        required: false,
      },
      textTruncate: {
        type: Boolean,
        default: false,
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
    text-transform: none;
  }

  .v-btn.has-text-truncate {
    width: 100%;
    min-width: 0;
  }

  .v-icon {
    vertical-align: baseline;
  }

</style>
