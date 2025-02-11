<template>

  <VBtn
    :style="{ color: $vuetify.theme.primary }"
    :target="target"
    :class="{ truncate }"
    :disabled="disabled"
    v-bind="$attrs"
    flat
    exact
    @keyup.enter.stop="$emit('click')"
    @click.stop="$emit('click')"
  >
    <slot>
      <span
        :class="{ 'text-truncate': truncate, notranslate }"
        :title="text"
        style="text-decoration: underline;"
      >
        {{ text }}
      </span>
      <Icon
        v-if="target === '_blank'"
        icon="openNewTab"
        :color="$themeTokens.primary"
        class="mx-1 rtl-flip"
      />

    </slot>
  </VBtn>

</template>
<script>

  export default {
    name: 'ActionLink',
    props: {
      text: {
        type: String,
        default: '',
      },
      target: {
        type: String,
        required: false,
        default: null,
      },
      truncate: {
        type: Boolean,
        default: false,
      },
      notranslate: {
        type: Boolean,
        default: false,
      },
      disabled: {
        type: Boolean,
        default: false,
      },
    },
  };

</script>
<style lang="scss" scoped>

  .v-btn {
    min-width: min-content;
    height: unset;
    min-height: min-content;
    padding: 0;
    margin: 0;
    font-weight: normal;
    text-transform: none;
  }

  .v-btn.truncate {
    width: 100%;
    min-width: 0;
  }

  .v-icon {
    vertical-align: baseline;
  }

</style>
